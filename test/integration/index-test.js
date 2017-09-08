'use strict';

const path = require('path');
const expect = require('chai').expect;
const tmp = require('tmp');
const gitFixtures = require('git-fixtures');
const gitDiffApply = require('../../src');
const buildTmp = require('../helpers/build-tmp');

const processExit = gitFixtures.processExit;
const _fixtureCompare = gitFixtures.fixtureCompare;

describe('Integration - index', function() {
  this.timeout(30000);

  let cwd;
  let localDir;
  let remoteDir;

  before(function() {
    cwd = process.cwd();
  });

  beforeEach(function() {
    localDir = tmp.dirSync().name;
    remoteDir = tmp.dirSync().name;
  });

  afterEach(function() {
    process.chdir(cwd);
  });

  function merge(options) {
    let localFixtures = options.localFixtures;
    let remoteFixtures = options.remoteFixtures;
    let dirty = options.dirty;
    let ignoreConflicts = !!options.ignoreConflicts;
    let ignoredFiles = options.ignoredFiles || [];
    let startTag = options.startTag || 'v1';
    let endTag = options.endTag || 'v3';

    buildTmp(
      localFixtures,
      localDir,
      dirty
    );
    buildTmp(
      remoteFixtures,
      remoteDir
    );

    process.chdir(localDir);

    let promise = gitDiffApply({
      remoteUrl: remoteDir,
      startTag,
      endTag,
      ignoreConflicts,
      ignoredFiles
    });

    return processExit({
      promise,
      cwd: localDir,
      commitMessage: 'local',
      expect
    });
  }

  function fixtureCompare(mergeFixtures) {
    _fixtureCompare({
      expect,
      actual: localDir,
      expected: path.join(cwd, mergeFixtures)
    });
  }

  it('handles no conflicts', function() {
    return merge({
      localFixtures: 'test/fixtures/local/noconflict',
      remoteFixtures: 'test/fixtures/remote/noconflict'
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/noconflict');

      expect(status).to.contain('modified:   changed.txt');
    });
  });

  it('handles dirty', function() {
    return merge({
      localFixtures: 'test/fixtures/local/conflict',
      remoteFixtures: 'test/fixtures/remote/conflict',
      dirty: true
    }).then(result => {
      let stderr = result.stderr;

      expect(stderr).to.contain('You must start with a clean working directory');
      expect(stderr).to.not.contain('UnhandledPromiseRejectionWarning');
    });
  });

  it('ignores files', function() {
    return merge({
      localFixtures: 'test/fixtures/local/ignored',
      remoteFixtures: 'test/fixtures/remote/ignored',
      ignoredFiles: ['ignored-changed.txt']
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/ignored');

      expect(status).to.contain('modified:   changed.txt');
      expect(status).to.not.contain('modified:   ignored-changed.txt');
    });
  });

  it('does nothing when tags match', function() {
    return merge({
      localFixtures: 'test/fixtures/local/noconflict',
      remoteFixtures: 'test/fixtures/remote/noconflict',
      startTag: 'v3',
      endTag: 'v3'
    }).then(result => {
      let stderr = result.stderr;

      expect(stderr).to.contain('Tags match, nothing to apply');
      expect(stderr).to.not.contain('UnhandledPromiseRejectionWarning');
    });
  });
});