module.exports = function(grunt) {

  grunt.initConfig({
    bowercopy: {
      options: {
        srcPrefix: 'bower_components',
      },
      libs: {
        options: {
          destPrefix: 'lib'
        },
        files: {
          'jquery/jquery.js': 'jquery/dist/jquery.js',
          'jquery-ui/jquery-ui.js': 'jquery-ui/jquery-ui.js',
          'jquery-ui/themes/smoothness': 'jquery-ui/themes/smoothness',
          'ace': 'ace-builds/src'
        }
                
      }
    },
    curl: {
      'lib/ace/mode-csound.js' : 
        'https://raw.githubusercontent.com/kunstmusik/csound-notebook' +
        '/master/public/javascripts/ace/mode-csound.js',
        
      'lib/ace/csound_highlight_rules.js':
        'https://raw.githubusercontent.com/kunstmusik/csound-notebook' +
        '/master/public/javascripts/ace/csound_highlight_rules.js',
        
      'csound.js':
        'https://raw.githubusercontent.com/kunstmusik/csound-notebook' +
        '/master/public/csound.js',
        
      'pnacl/Release/csound.nmf':
        'https://raw.githubusercontent.com/kunstmusik/csound-notebook' +
        '/master/public/pnacl/Release/csound.nmf',
        
      'pnacl/Release/csound.pexe':
        'https://raw.githubusercontent.com/kunstmusik/csound-notebook' +
        '/master/public/pnacl/Release/csound.pexe'
    }
  });

  grunt.loadNpmTasks('grunt-bowercopy');
  grunt.loadNpmTasks('grunt-curl');
  grunt.registerTask('default', ['bowercopy', 'curl']);

};