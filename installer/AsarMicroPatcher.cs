using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;

namespace AntigravityEnhancer
{
    public static class AsarMicroPatcher
    {
        public const string MainStart = "/* === ANTIGRAVITY ENHANCER MAIN BOOTSTRAP v3 START === */";
        public const string MainEnd = "/* === ANTIGRAVITY ENHANCER MAIN BOOTSTRAP v3 END === */";
        public const string PreloadStart = "/* === ANTIGRAVITY ENHANCER PRELOAD BOOTSTRAP v3 START === */";
        public const string PreloadEnd = "/* === ANTIGRAVITY ENHANCER PRELOAD BOOTSTRAP v3 END === */";

        public static readonly string MainStub = MainStart + "\n" +
            "try{const _el=require('electron'),_ep=require('path').join(_el.app.getPath('userData'),'enhancer','main-enhancer.js');if(require('fs').existsSync(_ep)){require(_ep).init({appRoot:__dirname,version:'3.0.0'});}}catch(_e){}\n" +
            MainEnd;

        public static readonly string PreloadStub = PreloadStart + "\n" +
            "try{const _eb=require('electron').ipcRenderer.sendSync('enhancer:get-bootstrap-sync');if(_eb&&!_eb.disabled&&_eb.code){(new Function('require','__ENHANCER_PAYLOAD__',_eb.code))(require,_eb);}}catch(_e){}\n" +
            PreloadEnd;

        private static JavaScriptSerializer CreateSerializer()
        {
            var js = new JavaScriptSerializer();
            js.MaxJsonLength = int.MaxValue;
            js.RecursionLimit = 256;
            return js;
        }

        private static uint ReadUInt32LE(byte[] buf, int offset)
        {
            return (uint)(buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24));
        }

        private static void WriteUInt32LE(byte[] buf, int offset, uint val)
        {
            buf[offset] = (byte)(val & 0xFF);
            buf[offset + 1] = (byte)((val >> 8) & 0xFF);
            buf[offset + 2] = (byte)((val >> 16) & 0xFF);
            buf[offset + 3] = (byte)((val >> 24) & 0xFF);
        }

        private static Dictionary<string, object> ParseHeader(byte[] asarBytes, out int payloadStart)
        {
            if (asarBytes == null || asarBytes.Length < 16)
                throw new InvalidDataException("Invalid ASAR archive: buffer too small.");

            uint i0 = ReadUInt32LE(asarBytes, 0);
            uint i1 = ReadUInt32LE(asarBytes, 4);
            uint i3 = ReadUInt32LE(asarBytes, 12);

            if (i0 != 4 || i3 == 0 || 16 + (long)i3 > asarBytes.Length)
                throw new InvalidDataException("Invalid ASAR v4 header integers.");

            payloadStart = (int)(8 + i1);
            if (payloadStart > asarBytes.Length)
                throw new InvalidDataException("Invalid ASAR v4 payload boundary.");

            string json = Encoding.UTF8.GetString(asarBytes, 16, (int)i3);
            var obj = CreateSerializer().DeserializeObject(json) as Dictionary<string, object>;
            if (obj == null || !obj.ContainsKey("files"))
                throw new InvalidDataException("Invalid ASAR v4 header JSON structure.");

            return obj;
        }

        private static Dictionary<string, object> GetEntry(Dictionary<string, object> root, params string[] parts)
        {
            var cur = root;
            foreach (string part in parts)
            {
                object filesObj;
                if (cur == null || !cur.TryGetValue("files", out filesObj)) return null;
                var filesMap = filesObj as Dictionary<string, object>;
                object nextObj;
                if (filesMap == null || !filesMap.TryGetValue(part, out nextObj)) return null;
                cur = nextObj as Dictionary<string, object>;
            }
            return cur;
        }

        private static string ReadEntryUtf8(byte[] asarBytes, int payloadStart, Dictionary<string, object> entry)
        {
            if (entry == null || !entry.ContainsKey("offset") || !entry.ContainsKey("size")) return "";
            long offset = Convert.ToInt64(entry["offset"]);
            int size = Convert.ToInt32(entry["size"]);
            if (payloadStart + offset + size > asarBytes.Length)
                throw new InvalidDataException("ASAR entry out of bounds.");
            return Encoding.UTF8.GetString(asarBytes, (int)(payloadStart + offset), size);
        }

        private static string StripBlock(string content, string startMarker, string endMarker, string legacyMarker)
        {
            string pattern = @"(?:\r?\n)?" + Regex.Escape(startMarker) + @"[\s\S]*?" + Regex.Escape(endMarker) + @"(?:\r?\n)?";
            string text = Regex.Replace(content, pattern, "");
            if (!string.IsNullOrEmpty(legacyMarker))
            {
                int idx = text.IndexOf(legacyMarker, StringComparison.Ordinal);
                if (idx >= 0)
                {
                    text = text.Substring(0, idx).TrimEnd() + "\n";
                }
            }
            return text;
        }

        private static string Sha256Hex(byte[] data, int offset, int count)
        {
            using (var sha = SHA256.Create())
            {
                byte[] hash = sha.ComputeHash(data, offset, count);
                var sb = new StringBuilder(hash.Length * 2);
                for (int i = 0; i < hash.Length; i++) sb.Append(hash[i].ToString("x2"));
                return sb.ToString();
            }
        }

        private static Dictionary<string, object> BuildIntegrity(byte[] fileBytes, int blockSize)
        {
            if (blockSize <= 0) blockSize = 4194304;
            string fullHash = Sha256Hex(fileBytes, 0, fileBytes.Length);
            var blocks = new List<string>();
            if (fileBytes.Length == 0)
            {
                blocks.Add(fullHash);
            }
            else
            {
                for (int off = 0; off < fileBytes.Length; off += blockSize)
                {
                    int len = Math.Min(blockSize, fileBytes.Length - off);
                    blocks.Add(Sha256Hex(fileBytes, off, len));
                }
            }
            var integ = new Dictionary<string, object>();
            integ["algorithm"] = "SHA256";
            integ["hash"] = fullHash;
            integ["blockSize"] = blockSize;
            integ["blocks"] = blocks.ToArray();
            return integ;
        }

        private static byte[] RebuildAsar(byte[] origBytes, Dictionary<string, object> headerObj, int payloadStart, Dictionary<string, byte[]> overrides)
        {
            var payloadChunks = new List<byte[]>();
            long currentOffset = 0;

            Func<Dictionary<string, object>, string, Dictionary<string, object>> collect = null;
            collect = (node, prefix) =>
            {
                if (node.ContainsKey("files"))
                {
                    var filesDict = node["files"] as Dictionary<string, object>;
                    var nextFiles = new Dictionary<string, object>();
                    foreach (var kv in filesDict)
                    {
                        string nextPrefix = string.IsNullOrEmpty(prefix) ? kv.Key : (prefix + "/" + kv.Key);
                        nextFiles[kv.Key] = collect((Dictionary<string, object>)kv.Value, nextPrefix);
                    }
                    var dirOut = new Dictionary<string, object>();
                    dirOut["files"] = nextFiles;
                    return dirOut;
                }
                if (node.ContainsKey("link") || node.ContainsKey("unpacked"))
                {
                    return new Dictionary<string, object>(node);
                }

                byte[] overrideBuf;
                byte[] chunkBytes;
                bool isOverridden = overrides.TryGetValue(prefix, out overrideBuf);
                int blockSize = 4194304;
                object oldIntegObj;
                if (node.TryGetValue("integrity", out oldIntegObj))
                {
                    var oldInteg = oldIntegObj as Dictionary<string, object>;
                    object bsObj;
                    if (oldInteg != null && oldInteg.TryGetValue("blockSize", out bsObj))
                    {
                        blockSize = Convert.ToInt32(bsObj);
                    }
                }

                if (isOverridden)
                {
                    chunkBytes = overrideBuf;
                }
                else
                {
                    long oldOff = Convert.ToInt64(node["offset"]);
                    int oldSize = Convert.ToInt32(node["size"]);
                    chunkBytes = new byte[oldSize];
                    Buffer.BlockCopy(origBytes, (int)(payloadStart + oldOff), chunkBytes, 0, oldSize);
                }

                var entryOut = new Dictionary<string, object>();
                entryOut["size"] = chunkBytes.Length;
                entryOut["offset"] = currentOffset.ToString();
                if (isOverridden || oldIntegObj == null)
                {
                    entryOut["integrity"] = BuildIntegrity(chunkBytes, blockSize);
                }
                else
                {
                    entryOut["integrity"] = oldIntegObj;
                }
                if (node.ContainsKey("executable"))
                {
                    entryOut["executable"] = node["executable"];
                }

                payloadChunks.Add(chunkBytes);
                currentOffset += chunkBytes.Length;
                return entryOut;
            };

            var nextHeader = collect(headerObj, "");
            string jsonStr = CreateSerializer().Serialize(nextHeader);
            byte[] jsonBytes = Encoding.UTF8.GetBytes(jsonStr);
            int paddedJsonLen = (jsonBytes.Length + 3) & ~3;
            byte[] headerBuf = new byte[16 + paddedJsonLen];
            WriteUInt32LE(headerBuf, 0, 4);
            WriteUInt32LE(headerBuf, 4, (uint)(8 + paddedJsonLen));
            WriteUInt32LE(headerBuf, 8, (uint)(4 + paddedJsonLen));
            WriteUInt32LE(headerBuf, 12, (uint)jsonBytes.Length);
            Buffer.BlockCopy(jsonBytes, 0, headerBuf, 16, jsonBytes.Length);

            using (var ms = new MemoryStream((int)(headerBuf.Length + currentOffset)))
            {
                ms.Write(headerBuf, 0, headerBuf.Length);
                foreach (var c in payloadChunks)
                {
                    if (c.Length > 0) ms.Write(c, 0, c.Length);
                }
                return ms.ToArray();
            }
        }

        private static void WriteAtomicBytes(string targetPath, byte[] bytes)
        {
            string tmp = targetPath + ".tmp." + Guid.NewGuid().ToString("N");
            File.WriteAllBytes(tmp, bytes);
            Exception lastEx = null;
            for (int attempt = 0; attempt < 5; attempt++)
            {
                try
                {
                    File.Copy(tmp, targetPath, true);
                    try { File.Delete(tmp); } catch { }
                    return;
                }
                catch (Exception ex)
                {
                    lastEx = ex;
                    Thread.Sleep(200);
                }
            }
            try { File.Delete(tmp); } catch { }
            if (lastEx != null) throw lastEx;
        }

        public static bool IsBootstrapped(string asarPath)
        {
            if (!File.Exists(asarPath)) return false;
            try
            {
                byte[] buf = File.ReadAllBytes(asarPath);
                int payloadStart;
                var header = ParseHeader(buf, out payloadStart);
                string mainTxt = ReadEntryUtf8(buf, payloadStart, GetEntry(header, "dist", "main.js"));
                string preloadTxt = ReadEntryUtf8(buf, payloadStart, GetEntry(header, "dist", "preload.js"));
                bool hasMain = mainTxt.Contains(MainStart) && mainTxt.Contains(MainEnd);
                bool hasPreload = preloadTxt.Contains(PreloadStart) && preloadTxt.Contains(PreloadEnd);
                bool hasLegacy = preloadTxt.Contains("// Injected Korean localization engine");
                return hasMain && hasPreload && !hasLegacy;
            }
            catch
            {
                return false;
            }
        }

        public static bool EnsureBootstrapped(string asarPath, bool force)
        {
            if (!File.Exists(asarPath)) throw new FileNotFoundException("app.asar not found", asarPath);
            byte[] origBytes = File.ReadAllBytes(asarPath);
            int payloadStart;
            var header = ParseHeader(origBytes, out payloadStart);
            var mainEntry = GetEntry(header, "dist", "main.js");
            var preloadEntry = GetEntry(header, "dist", "preload.js");
            if (mainEntry == null || preloadEntry == null)
                throw new InvalidDataException("dist/main.js or dist/preload.js not found in app.asar.");

            string mainRaw = ReadEntryUtf8(origBytes, payloadStart, mainEntry);
            string preloadRaw = ReadEntryUtf8(origBytes, payloadStart, preloadEntry);

            bool hasMain = mainRaw.Contains(MainStart) && mainRaw.Contains(MainEnd);
            bool hasPreload = preloadRaw.Contains(PreloadStart) && preloadRaw.Contains(PreloadEnd);
            bool hasLegacy = preloadRaw.Contains("// Injected Korean localization engine");

            if (hasMain && hasPreload && !hasLegacy && !force)
            {
                return false; // Already clean v3 bootstrapped
            }

            // Refresh backup if currently pristine vanilla
            if (!hasMain && !hasPreload && !hasLegacy)
            {
                string backupPath = asarPath + ".original";
                try
                {
                    if (!File.Exists(backupPath) || new FileInfo(backupPath).Length != origBytes.Length)
                    {
                        File.WriteAllBytes(backupPath, origBytes);
                    }
                }
                catch { }
            }

            string cleanMain = StripBlock(mainRaw, MainStart, MainEnd, null).TrimEnd();
            string cleanPreload = StripBlock(preloadRaw, PreloadStart, PreloadEnd, "// Injected Korean localization engine").TrimEnd();

            string nextMain = cleanMain + "\n\n" + MainStub + "\n";
            string nextPreload = cleanPreload + "\n\n" + PreloadStub + "\n";

            var overrides = new Dictionary<string, byte[]>();
            overrides["dist/main.js"] = Encoding.UTF8.GetBytes(nextMain);
            overrides["dist/preload.js"] = Encoding.UTF8.GetBytes(nextPreload);

            byte[] outBytes = RebuildAsar(origBytes, header, payloadStart, overrides);
            WriteAtomicBytes(asarPath, outBytes);
            return true;
        }

        public static bool UnpatchVanilla(string asarPath)
        {
            if (!File.Exists(asarPath)) throw new FileNotFoundException("app.asar not found", asarPath);
            string backupPath = asarPath + ".original";
            byte[] curBytes = File.ReadAllBytes(asarPath);
            int payloadStart;
            var header = ParseHeader(curBytes, out payloadStart);
            var mainEntry = GetEntry(header, "dist", "main.js");
            var preloadEntry = GetEntry(header, "dist", "preload.js");
            if (mainEntry == null || preloadEntry == null) return false;

            string mainRaw = ReadEntryUtf8(curBytes, payloadStart, mainEntry);
            string preloadRaw = ReadEntryUtf8(curBytes, payloadStart, preloadEntry);

            if (!mainRaw.Contains(MainStart) && !preloadRaw.Contains(PreloadStart) && !preloadRaw.Contains("// Injected Korean localization engine"))
            {
                return false;
            }

            string cleanMain = StripBlock(mainRaw, MainStart, MainEnd, null);
            string cleanPreload = StripBlock(preloadRaw, PreloadStart, PreloadEnd, "// Injected Korean localization engine");

            if (File.Exists(backupPath))
            {
                try
                {
                    byte[] origBytes = File.ReadAllBytes(backupPath);
                    int origStart;
                    var origHeader = ParseHeader(origBytes, out origStart);
                    string origMain = ReadEntryUtf8(origBytes, origStart, GetEntry(origHeader, "dist", "main.js"));
                    string origPreload = ReadEntryUtf8(origBytes, origStart, GetEntry(origHeader, "dist", "preload.js"));
                    if (origMain.TrimEnd() == cleanMain.TrimEnd() && origPreload.TrimEnd() == cleanPreload.TrimEnd())
                    {
                        WriteAtomicBytes(asarPath, origBytes);
                        return true;
                    }
                }
                catch { }
            }

            var overrides = new Dictionary<string, byte[]>();
            overrides["dist/main.js"] = Encoding.UTF8.GetBytes(cleanMain);
            overrides["dist/preload.js"] = Encoding.UTF8.GetBytes(cleanPreload);
            byte[] outBytes = RebuildAsar(curBytes, header, payloadStart, overrides);
            WriteAtomicBytes(asarPath, outBytes);
            return true;
        }
    }
}
