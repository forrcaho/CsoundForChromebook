var editor = ace.edit("editor");
var dirty = true;
var csdFileEntry;
var csdObj;

function parseCsd(text) {
  var csdObj = {};
  var match = /<CsoundSynthesizer>([\s\S]*?)<\/CsoundSynthesizer>/.exec(text);
  if (match === null) {
    console.log('no <CsoundSynthesizer> tags found in parseCsd');
    return csdObj;
  }
  var innerText = match[1];
  var sectionRE = /<([^>]+)>([\s\S]*?)<\/\1>/g;
  while ( (match = sectionRE.exec(innerText)) !== null) {
    var section = match[1];
    var contents = match[2].replace(/^\s*/, '');
    csdObj[section] = contents;
  }
  return csdObj;
}

function restartCsound() {
  csound.destroyModule();
  csound.attachDefaultListeners();
  csound.createModule();
}

function handleError(e) {
  // TODO: should display this to user somehow
  console.log(e);
}

function setDirty() {
  console.log('entering setDirty()');
  if (dirty) return;
  console.log('doing something in setDirty()');
  if (typeof csdFileEntry !== 'undefined') {
    $('#saveButton').button("option", "disabled", false);
  }
  $('#saveAsButton').button("option", "disabled", false);
  dirty = true;
}

function unsetDirty() {
  console.log('entering unsetDirty()');
  if (!dirty) return;
  console.log('doing something in unsetDirty()');
  $('#saveButton').button("option", "disabled", true);
  $('#saveAsButton').button("option", "disabled", true);
  dirty = false;
}

function saveCsd() {
  csdFileEntry.createWriter(function(writer) {
    writer.onerror = handleError;
    // http://stackoverflow.com/questions/6792607/using-the-html5-filewriter-truncate-method
    var truncated = false;
    writer.onwrite = function(e) {
      if (!truncated) {
        truncated = true;
        this.truncate(this.position);
      }
      unsetDirty();
    };
    var editorContents = editor.getValue();
    var blob = new Blob([editorContents], {type: 'text/plain'});
    writer.write(blob);
  }, handleError);
}

function saveHandler() {
  saveCsd();
}

function saveAsHandler() {
  chrome.fileSystem.chooseEntry(
    {
      type: "saveFile",
      suggestedName: (typeof csdFileEntry === 'undefined') ?
        'untitled.csd' : csdFileEntry.name,
      accepts: [
        { extensions: [ "csd" ] },
      ]
    },
    function(fe) {
      if (fe) {
        csdFileEntry = fe;
       // document.querySelector('#filename').innerText = fe.name;
        saveCsd();
      }
    }
  );
}

function openHandler() {
  console.log('openHandler called');
  if (dirty) {
    // TODO: warn about losing current editor content
  }
  chrome.fileSystem.chooseEntry(
    {
      type: "openFile"
    },
    function(fe) {
      fe.file(
        function(file) {
          var reader = new FileReader();
          reader.onerror = handleError;
          reader.onload = function() {
            editor.getSession().removeListener("change", setDirty);
            editor.setValue(reader.result);
            editor.getSession().on("change", setDirty);
          };
          reader.readAsText(file);
        }, handleError
      );
      if (fe) {
        csdFileEntry = fe;
        //document.querySelector('#filename').innerText = fe.name;
        unsetDirty();
      }
    }
  );
}

function playCsdHandler() {
  console.log('playCsdHandler entered');
  csdObj = parseCsd(editor.getValue());
  restartCsound();
}

function configureEditor() {
  editor.setTheme("ace/theme/textmate");
  editor.getSession().setMode("ace/mode/csound");
  editor.getSession().on("change", setDirty);
}

function configureControls() {
  $('#saveButton').button().on("click", saveHandler);
  $('#saveAsButton').button().on("click", saveAsHandler);
  $('#openButton').button().on("click", openHandler);
  $('#playCsdButton').button().on("click", playCsdHandler);
}

function configureTabs() {
    var tabCounter = 1;
  $('div#tabs').tabs({
    activate: function (event, ui) {
      if ( ui.newTab.find("a").attr("href") == "#add_tab") {
        tabCounter++;
        console.log("adding tab " + tabCounter);
        var divId = "tab" + tabCounter;
        $('div#tabs').append('<div id="' + divId + '">Tab number ' + tabCounter + ' </div>');
        $('div#tabs ul li').last().before('<li><a href="#' + divId + '">Tab #' + tabCounter
        + '</a><span id="close' + divId + '" class="closetab ui-icon ui-icon-closethick"></span></li>');
        $('span#close' + divId).on('mouseover', function() {
          $(this).css('background-color', '#f66');
        });
        $('span#close' + divId).on('mouseout', function() {
          $(this).css('background-color', '');
        });
        $('span#close' + divId).on('click', function() {
          $(this).closest('li').remove();
          $('div#' + divId).remove();
          $('div#tabs').tabs('refresh');
        });
        
        $('div#tabs').tabs('refresh');
        $('div#tabs').tabs('option', 'active', -2);

      }
    }
  });

}

function moduleDidLoad() {
  $('#title').text('Csound for Chromebook');
  console.log("csound module loaded");
  if (typeof csdObj !== 'undefined') {
    csound.Play();
    csound.CompileOrc(csdObj.CsInstruments);
    csound.ReadScore(csdObj.CsScore);
  }
}

function handleMessage(message) {
  console.log(message.data);
}

window.onload = function() {
  configureEditor();
  configureControls();
  configureTabs();
  unsetDirty();
  //document.querySelector('#filename').innerText = 'untitled.csd';
};
