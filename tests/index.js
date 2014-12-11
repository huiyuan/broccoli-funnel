'use strict';

var path = require('path');
var expect = require('expect.js');
var walkSync = require('walk-sync');
var broccoli = require('broccoli');

require('mocha-jshint')();

var Funnel = require('..');

describe('broccoli-funnel', function(){
  var fixturePath = path.join(__dirname, 'fixtures');
  var builder;

  afterEach(function() {
    if (builder) {
      return builder.cleanup();
    }
  });

  describe('processFile', function() {
    it('is not called when simply linking roots (aka no include/exclude)', function() {
      var inputPath = path.join(fixturePath, 'dir1');
      var tree = new Funnel(inputPath, {
        processFile: function() {
          throw new Error('should never be called');
        }
      });

      builder = new broccoli.Builder(tree);
      return builder.build()
        .then(function(results) {
          var outputPath = results.directory;

          expect(walkSync(outputPath)).to.eql(walkSync(inputPath));
        });
    });

    it('is called for each included file', function() {
      var processFileArguments = [];

      var inputPath = path.join(fixturePath, 'dir1');
      var tree = new Funnel(inputPath, {
        include: [ /.png$/, /.js$/ ],
        destDir: 'foo',

        processFile: function(sourcePath, destPath, relativePath) {
          processFileArguments.push([sourcePath, destPath, relativePath]);
        }
      });

      builder = new broccoli.Builder(tree);
      return builder.build()
        .then(function(results) {
          var outputPath = results.directory;
          var expected = [
            [ path.join(fixturePath, 'dir1', 'subdir1/subsubdir1/foo.png'),
              path.join(outputPath, 'foo/subdir1/subsubdir1/foo.png'),
              'subdir1/subsubdir1/foo.png' ],
            [ path.join(fixturePath, 'dir1', 'subdir1/subsubdir2/some.js'),
              path.join(outputPath, 'foo/subdir1/subsubdir2/some.js'), 
              'subdir1/subsubdir2/some.js' ]
          ];

          expect(processFileArguments).to.eql(expected);
        });
    });

    it('is responsible for generating files in the destDir', function() {
      var inputPath = path.join(fixturePath, 'dir1');
      var tree = new Funnel(inputPath, {
        include: [ /.png$/, /.js$/ ],
        destDir: 'foo',

        processFile: function() {
          /* do nothing */
        }
      });

      builder = new broccoli.Builder(tree);
      return builder.build()
        .then(function(results) {
          var outputPath = results.directory;

          expect(walkSync(outputPath)).to.eql([]);
        });
    });

  });

  describe('without filtering options', function() {
    it('simply returns a copy of the input tree', function() {
      var inputPath = path.join(fixturePath, 'dir1');
      var tree = new Funnel(inputPath);

      builder = new broccoli.Builder(tree);
      return builder.build()
        .then(function(results) {
          var outputPath = results.directory;

          expect(walkSync(outputPath)).to.eql(walkSync(inputPath));
        });
    });

    it('simply returns a copy of the input tree at a nested destination', function() {
      var inputPath = path.join(fixturePath, 'dir1');
      var tree = new Funnel(inputPath, {
        destDir: 'some-random'
      });

      builder = new broccoli.Builder(tree);
      return builder.build()
        .then(function(results) {
          var outputPath = path.join(results.directory, 'some-random');

          expect(walkSync(outputPath)).to.eql(walkSync(inputPath));
        });
    });

    it('simply returns a copy of the input tree at a nested source', function() {
      var inputPath = path.join(fixturePath, 'dir1');
      var tree = new Funnel(inputPath, {
        srcDir: 'subdir1'
      });

      builder = new broccoli.Builder(tree);
      return builder.build()
        .then(function(results) {
          var restrictedInputPath = path.join(inputPath, 'subdir1');
          var outputPath = results.directory;

          expect(walkSync(outputPath)).to.eql(walkSync(restrictedInputPath));
        });
    });
  });

  describe('with filtering options', function() {

    describe('filtering with `files`', function() {
      it('can take a list of files', function() {
        var inputPath = path.join(fixturePath, 'dir1');
        var tree = new Funnel(inputPath, {
          files: [
            'subdir1/subsubdir1/foo.png',
            'subdir2/bar.css'
          ]
        });

        builder = new broccoli.Builder(tree);
        return builder.build()
        .then(function(results) {
          var outputPath = results.directory;

          var expected = [
            'subdir1/',
            'subdir1/subsubdir1/',
            'subdir1/subsubdir1/foo.png',
            'subdir2/',
            'subdir2/bar.css'
          ];

          expect(walkSync(outputPath)).to.eql(expected);
        });
      });
    });

    describe('include filtering', function() {
      it('can take a pattern', function() {
        var inputPath = path.join(fixturePath, 'dir1');
        var tree = new Funnel(inputPath, {
          include: [ /.png$/ ]
        });

        builder = new broccoli.Builder(tree);
        return builder.build()
        .then(function(results) {
          var outputPath = results.directory;

          var expected = [
            'subdir1/',
            'subdir1/subsubdir1/',
            'subdir1/subsubdir1/foo.png'
          ];

          expect(walkSync(outputPath)).to.eql(expected);
        });
      });

      it('can take multiple patterns', function() {
        var inputPath = path.join(fixturePath, 'dir1');
        var tree = new Funnel(inputPath, {
          include: [ /.png$/, /.js$/ ]
        });

        builder = new broccoli.Builder(tree);
        return builder.build()
        .then(function(results) {
          var outputPath = results.directory;

          var expected = [
            'subdir1/',
            'subdir1/subsubdir1/',
            'subdir1/subsubdir1/foo.png',
            'subdir1/subsubdir2/',
            'subdir1/subsubdir2/some.js'
          ];

          expect(walkSync(outputPath)).to.eql(expected);
        });
      });
    });

    describe('exclude filtering', function() {
      it('can take a pattern', function() {
        var inputPath = path.join(fixturePath, 'dir1');
        var tree = new Funnel(inputPath, {
          exclude: [ /.png$/ ]
        });

        builder = new broccoli.Builder(tree);
        return builder.build()
        .then(function(results) {
          var outputPath = results.directory;

          var expected = [
            'root-file.txt',
            'subdir1/',
            'subdir1/subsubdir2/',
            'subdir1/subsubdir2/some.js',
            'subdir2/',
            'subdir2/bar.css'
          ];

          expect(walkSync(outputPath)).to.eql(expected);
        });
      });

      it('can take multiple patterns', function() {
        var inputPath = path.join(fixturePath, 'dir1');
        var tree = new Funnel(inputPath, {
          exclude: [ /.png$/, /.js$/ ]
        });

        builder = new broccoli.Builder(tree);
        return builder.build()
        .then(function(results) {
          var outputPath = results.directory;

          var expected = [
            'root-file.txt',
            'subdir2/',
            'subdir2/bar.css'
          ];

          expect(walkSync(outputPath)).to.eql(expected);
        });
      });
    });

    it('combined filtering', function() {
      var inputPath = path.join(fixturePath, 'dir1');
      var tree = new Funnel(inputPath, {
        exclude: [ /.png$/, /.js$/ ],
        include: [ /.txt$/ ]
      });

      builder = new broccoli.Builder(tree);
      return builder.build()
      .then(function(results) {
        var outputPath = results.directory;

        var expected = [
          'root-file.txt',
        ];

        expect(walkSync(outputPath)).to.eql(expected);
      });
    });

    it('creates its output directory even if no files are matched', function() {
      var inputPath = path.join(fixturePath, 'dir1');
      var tree = new Funnel(inputPath, {
        exclude: [ /.*/ ]
      });

      builder = new broccoli.Builder(tree);
      return builder.build()
      .then(function(results) {
        var outputPath = results.directory;

        expect(walkSync(outputPath)).to.eql([ ]);
      });
    });
  });

  describe('with customized destination paths', function() {
    it('uses custom getDestinationPath function if provided', function() {
      var inputPath = path.join(fixturePath, 'dir1');
      var tree = new Funnel(inputPath);

      tree.getDestinationPath = function(relativePath) {
        return path.join('foo', relativePath);
      };

      builder = new broccoli.Builder(tree);
      return builder.build()
        .then(function(results) {
          var outputPath = results.directory;

          expect(walkSync(path.join(outputPath, 'foo'))).to.eql(walkSync(inputPath));
        });
    });
  });

  describe('includeFile', function() {
    var tree;

    beforeEach(function() {
      var inputPath = path.join(fixturePath, 'dir1');

      tree = new Funnel(inputPath);
    });

    it('returns false if the path is included in an exclude filter', function() {
      tree.exclude = [ /.foo$/, /.bar$/ ];

      expect(tree.includeFile('blah/blah/blah.foo')).to.not.be.ok();
      expect(tree.includeFile('blah/blah/blah.bar')).to.not.be.ok();
      expect(tree.includeFile('blah/blah/blah.baz')).to.be.ok();
    });

    it('returns true if the path is included in an include filter', function() {
      tree.include = [ /.foo$/, /.bar$/ ];

      expect(tree.includeFile('blah/blah/blah.foo')).to.be.ok();
      expect(tree.includeFile('blah/blah/blah.bar')).to.be.ok();
    });

    it('returns false if the path is not included in an include filter', function() {
      tree.include = [ /.foo$/, /.bar$/ ];

      expect(tree.includeFile('blah/blah/blah.baz')).to.not.be.ok();
    });

    it('returns true if no patterns were used', function() {
      expect(tree.includeFile('blah/blah/blah.baz')).to.be.ok();
    });

    it('uses a cache to ensure we do not recalculate the filtering on subsequent attempts', function() {
      expect(tree.includeFile('blah/blah/blah.baz')).to.be.ok();

      // changing the filter mid-run should have no result on
      // previously calculated paths
      tree.include = [ /.foo$/, /.bar$/ ];

      expect(tree.includeFile('blah/blah/blah.baz')).to.be.ok();
    });
  });

  describe('lookupDestinationPath', function() {
    var tree;

    beforeEach(function() {
      var inputPath = path.join(fixturePath, 'dir1');

      tree = new Funnel(inputPath);
    });

    it('returns the input path if no getDestinationPath method is defined', function() {
      var relativePath = 'foo/bar/baz';

      expect(tree.lookupDestinationPath(relativePath)).to.be.equal(relativePath);
    });

    it('returns the output of getDestinationPath method if defined', function() {
      var relativePath = 'foo/bar/baz';
      var expected = 'blah/blah/blah';

      tree.getDestinationPath = function() {
        return expected;
      };

      expect(tree.lookupDestinationPath(relativePath)).to.be.equal(expected);
    });

    it('only calls getDestinationPath once and caches result', function() {
      var relativePath = 'foo/bar/baz';
      var expected = 'blah/blah/blah';
      var getDestPathValue = expected;
      var getDestPathCalled = 0;

      tree.getDestinationPath = function() {
        getDestPathCalled++;

        return expected;
      };

      expect(tree.lookupDestinationPath(relativePath)).to.be.equal(expected);
      expect(getDestPathCalled).to.be.equal(1);

      getDestPathValue = 'some/other/thing';

      expect(tree.lookupDestinationPath(relativePath)).to.be.equal(expected);
      expect(getDestPathCalled).to.be.equal(1);
    });
  });
});
