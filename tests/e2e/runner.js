// tests/e2e/runner.js
// Central Test Runner for Antigravity E2E Test Suite (Tiers 1–4)

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
    this.filterTier = null;
    this.filterFeatures = [];
    this.summaryOnly = false;
  }

  register(tier, feature, name, fn) {
    this.tests.push({ tier, feature, name, fn });
  }

  parseArgs(argv) {
    for (let i = 2; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === '--tier' && argv[i + 1]) {
        this.filterTier = parseInt(argv[++i], 10);
      } else if (arg.startsWith('--tier=')) {
        this.filterTier = parseInt(arg.split('=')[1], 10);
      } else if (arg === '--feature' && argv[i + 1]) {
        this.filterFeatures = argv[++i].split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      } else if (arg.startsWith('--feature=')) {
        this.filterFeatures = arg.split('=')[1].split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      } else if (arg === '--summary') {
        this.summaryOnly = true;
      } else if (arg === '--help' || arg === '-h') {
        this.printHelp();
        process.exit(0);
      }
    }
  }

  printHelp() {
    console.log(`
Antigravity E2E Test Suite Runner
Usage: node tests/e2e/runner.js [options]

Options:
  --tier <1-4>         Run only specified Tier (1: Features, 2: Boundaries, 3: Combinations, 4: Scenarios)
  --feature <F1-F21>   Filter tests matching feature ID (e.g., F1, F14)
  --summary            Display summary tables only without individual test lines
  --help, -h           Show this help message
`);
  }

  async run() {
    const startTime = Date.now();
    console.log(`\n${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}    Antigravity E2E Comprehensive Test Suite Runner (Tiers 1–4)${colors.reset}`);
    console.log(`${colors.cyan}========================================================================${colors.reset}\n`);

    const filteredTests = this.tests.filter(t => {
      if (this.filterTier && t.tier !== this.filterTier) return false;
      if (this.filterFeatures && this.filterFeatures.length > 0 && !this.filterFeatures.includes(t.feature)) return false;
      return true;
    });

    console.log(`Discovered ${colors.bold}${this.tests.length}${colors.reset} total tests. Running ${colors.bold}${filteredTests.length}${colors.reset} matching tests...\n`);

    let passedCount = 0;
    let failedCount = 0;
    let currentTier = null;
    let currentFeature = null;

    for (const test of filteredTests) {
      if (test.tier !== currentTier) {
        currentTier = test.tier;
        const tierNames = {
          1: 'Tier 1: Comprehensive Feature Coverage (Happy Path)',
          2: 'Tier 2: Boundary, Corner Cases & Robustness',
          3: 'Tier 3: Cross-Feature Pairwise Combinations',
          4: 'Tier 4: Real-World Workflow Scenarios'
        };
        console.log(`\n${colors.bold}${colors.magenta}=== ${tierNames[currentTier] || `Tier ${currentTier}`} ===${colors.reset}`);
        currentFeature = null;
      }

      if (test.feature !== currentFeature) {
        currentFeature = test.feature;
        console.log(`\n  ${colors.bold}${colors.white}[${currentFeature}]${colors.reset}`);
      }

      const tStart = Date.now();
      let status = 'PASS';
      let error = null;

      try {
        await test.fn();
        passedCount++;
        if (!this.summaryOnly) {
          console.log(`    ${colors.green}✔ PASS${colors.reset} ${colors.dim}(${Date.now() - tStart}ms)${colors.reset} ${test.name}`);
        }
      } catch (err) {
        status = 'FAIL';
        error = err;
        failedCount++;
        if (!this.summaryOnly) {
          console.log(`    ${colors.red}✖ FAIL${colors.reset} ${colors.dim}(${Date.now() - tStart}ms)${colors.reset} ${test.name}`);
          console.log(`      ${colors.red}Error: ${err.message}${colors.reset}`);
        }
      }

      this.results.push({
        tier: test.tier,
        feature: test.feature,
        name: test.name,
        status,
        error: error ? error.message : null,
        duration: Date.now() - tStart
      });
    }

    const duration = Date.now() - startTime;
    this.printSummary(passedCount, failedCount, duration);

    // Return exit code 0 if all tests pass, 1 if any failed
    return failedCount === 0 ? 0 : 1;
  }

  printSummary(passed, failed, duration) {
    console.log(`\n${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}                          TEST EXECUTION SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}========================================================================${colors.reset}\n`);

    // Tier Summary Table
    console.log(`${colors.bold}Coverage by Tier:${colors.reset}`);
    console.log(`┌──────────────────────────────────────────────┬────────┬────────┬────────┬──────────┐`);
    console.log(`│ Tier                                         │ Total  │ Passed │ Failed │ Pass %   │`);
    console.log(`├──────────────────────────────────────────────┼────────┼────────┼────────┼──────────┤`);

    const tiers = [1, 2, 3, 4];
    for (const tr of tiers) {
      const items = this.results.filter(r => r.tier === tr);
      const p = items.filter(r => r.status === 'PASS').length;
      const f = items.filter(r => r.status === 'FAIL').length;
      const pct = items.length > 0 ? ((p / items.length) * 100).toFixed(1) + '%' : 'N/A';
      const label = {
        1: 'Tier 1: Feature Coverage (F1–F21)          ',
        2: 'Tier 2: Boundary & Corner Cases (F1–F21)   ',
        3: 'Tier 3: Cross-Feature Combinations         ',
        4: 'Tier 4: Real-World Scenarios               '
      }[tr];
      console.log(`│ ${label} │ ${String(items.length).padEnd(6)} │ ${String(p).padEnd(6)} │ ${String(f).padEnd(6)} │ ${pct.padEnd(8)} │`);
    }
    console.log(`└──────────────────────────────────────────────┴────────┴────────┴────────┴──────────┘`);

    // Feature Checklist (F1 through F21)
    console.log(`\n${colors.bold}Feature Inventory Checklist (F1–F21):${colors.reset}`);
    console.log(`┌─────────┬──────────────────────────────────────────┬───────┬───────┬───────┬─────────┐`);
    console.log(`│ Feature │ Title                                    │ T1    │ T2    │ T3    │ Status  │`);
    console.log(`├─────────┼──────────────────────────────────────────┼───────┼───────┼───────┼─────────┤`);

    const featureNames = {
      F1: 'Inline SVG Dropdown Icons                 ',
      F2: 'DOM Original Text Preservation            ',
      F3: 'Monospace Font Preservation               ',
      F4: 'Code Block Copy Feedback & Toast          ',
      F5: '9-Language Localization Dictionaries      ',
      F6: 'Dynamic 9-Language Dropdown               ',
      F7: 'Alt+Shift+L Keyboard Shortcut Cycle       ',
      F8: 'Quick-Switch Language Button              ',
      F9: 'Quota Widget Refreshed Visual Design      ',
      F10: 'Model Breakdown & Countdown Timers        ',
      F11: 'Low-Quota Warning Indicator (<20%)        ',
      F12: 'Quota Manual Refresh Button               ',
      F13: 'Quota Widget Display Toggle               ',
      F14: 'Installer Custom ASCII Art Banner         ',
      F15: 'OS Locale Auto-Detection                  ',
      F16: 'Installer Interactive Dual Menu           ',
      F17: 'Installer Revised Feature Highlights      ',
      F18: 'Safe Rollback & Cache Purge               ',
      F19: 'ASAR Distribution Packaging               ',
      F20: 'Process Execution Safety Enforcement      ',
      F21: 'Full E2E Test Suite Validation            ',
      F22: 'Modular Enhancer & Manifest Integrity     ',
      F23: 'Lossless ASAR v4 Micro-Bootstrapper       ',
      F24: 'Secure In-App Self-Updater & Rollback     ',
      F25: '2.31.2 Models & Persistent Guardian       '
    };

    for (let i = 1; i <= 25; i++) {
      const fid = `F${i}`;
      const t1 = this.results.filter(r => r.tier === 1 && r.feature === fid);
      const t2 = this.results.filter(r => r.tier === 2 && r.feature === fid);
      const t3 = this.results.filter(r => r.tier === 3 && (r.feature === fid || r.name.includes(fid)));

      const t1p = t1.filter(r => r.status === 'PASS').length;
      const t2p = t2.filter(r => r.status === 'PASS').length;
      const t3p = t3.filter(r => r.status === 'PASS').length;

      const allTests = [...t1, ...t2, ...t3];
      let statusStr = colors.yellow + 'PENDING' + colors.reset;
      if (allTests.length > 0 && allTests.every(r => r.status === 'PASS')) {
        statusStr = colors.green + 'PASS   ' + colors.reset;
      } else if (allTests.some(r => r.status === 'FAIL')) {
        statusStr = colors.red + 'FAIL   ' + colors.reset;
      }

      const t1Str = `${t1p}/${t1.length}`.padEnd(5);
      const t2Str = `${t2p}/${t2.length}`.padEnd(5);
      const t3Str = `${t3p}/${t3.length}`.padEnd(5);
      const name = featureNames[fid] || fid.padEnd(42);

      console.log(`│ ${fid.padEnd(7)} │ ${name} │ ${t1Str} │ ${t2Str} │ ${t3Str} │ ${statusStr} │`);
    }
    console.log(`└─────────┴──────────────────────────────────────────┴───────┴───────┴───────┴─────────┘`);

    console.log(`\n${colors.bold}Totals:${colors.reset}`);
    console.log(`  Total Tests Run : ${this.results.length}`);
    console.log(`  Passed          : ${colors.green}${passed}${colors.reset}`);
    console.log(`  Failed          : ${failed > 0 ? colors.red + failed + colors.reset : colors.green + '0' + colors.reset}`);
    console.log(`  Execution Time  : ${(duration / 1000).toFixed(2)}s\n`);

    if (failed === 0) {
      console.log(`${colors.bold}${colors.green}>>> ALL TESTS PASSED SUCCESSFULLY (Exit Code 0) <<<${colors.reset}\n`);
    } else {
      console.log(`${colors.bold}${colors.yellow}>>> ${failed} TEST(S) FAILED (Pending implementation in respective milestones) <<<${colors.reset}\n`);
    }
  }
}

// Global runner singleton
const runner = new TestRunner();

// Helper to register tests
function registerTest(tier, feature, name, fn) {
  runner.register(tier, feature, name, fn);
}

module.exports = {
  runner,
  registerTest
};

// Main execution entrypoint
if (require.main === module) {
  const preloadFile = path.join(__dirname, '..', '..', 'extracted_korean', 'dist', 'preload.js');
  const legacySuites = [
    './test_tier1_features',
    './test_tier2_boundaries',
    './test_tier3_combinations',
    './test_tier4_scenarios'
  ];
  if (fs.existsSync(preloadFile)) {
    for (const suite of legacySuites) {
      if (fs.existsSync(path.join(__dirname, suite + '.js'))) {
        require(suite);
      }
    }
  }
  require('./test_v3_architecture');

  runner.parseArgs(process.argv);
  runner.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(err => {
    console.error('Fatal Runner Error:', err);
    process.exit(1);
  });
}
