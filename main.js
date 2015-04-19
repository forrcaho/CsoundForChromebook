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
    document.querySelector('#saveButton').disabled = false;
  }
  document.querySelector('#saveAsButton').disabled = false;
  dirty = true;
}

function unsetDirty() {
  console.log('entering unsetDirty()');
  if (!dirty) return;
  console.log('doing something in unsetDirty()');
  document.querySelector('#saveButton').disabled = true;
  document.querySelector('#saveAsButton').disabled = true;
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
        document.querySelector('#filename').innerText = fe.name;
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
        document.querySelector('#filename').innerText = fe.name;
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
  document.querySelector('#saveButton')
    .addEventListener("click", saveHandler);
  document.querySelector('#saveAsButton')
    .addEventListener("click", saveAsHandler);
  document.querySelector('#openButton')
    .addEventListener("click", openHandler);
  document.querySelector('#playCsdButton')
    .addEventListener("click", playCsdHandler);
}

function moduleDidLoad() {
  document.querySelector('#title').innerText = 'Csound for Chromebook';
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
  unsetDirty();
  document.querySelector('#filename').innerText = 'untitled.csd';
};
