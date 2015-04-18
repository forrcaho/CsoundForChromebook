var editor = ace.edit("editor");
var dirty = true;
var tempCsdFileEntry;
var csdFileEntry;

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

function saveCsd(destFileEntry) {
  destFileEntry.createWriter(function(writer) {
    writer.onerror = handleError;
    // http://stackoverflow.com/questions/6792607/using-the-html5-filewriter-truncate-method
    var truncated = false;
    writer.onwrite = function(e) {
      if (!truncated) {
        truncated = true;
        this.truncate(this.position);
      }
      if (destFileEntry !== tempCsdFileEntry) {
        unsetDirty();
      }
    };
    var editorContents = editor.getValue();
    var blob = new Blob([editorContents], {type: 'text/plain'});
    writer.write(blob);
  }, handleError);
}

function saveHandler() {
  saveCsd(csdFileEntry);
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
        saveCsd(csdFileEntry);
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
  console.log('playCsdHandler called');
  if (typeof tempCsdFileEntry === 'undefined') {
    throw 'tempCsdFileEntry used before defined';
  }
  saveCsd(tempCsdFileEntry);
  csound.Play();
  csound.PlayCsd('temp.csd');
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

window.moduleDidLoad = function() {
  document.querySelector('#title').innerText = 'Csound for Chromebook';
  console.log("csound module loaded");
};

function handleMessage (message) {
  console.log(message.data);
}

function setUpFs(fs) {
  fs.root.getDirectory('local', 
            { create: true, exclusive: false },
            setUpLocalDir,
            handleError);
            
}

function setUpLocalDir(dirEnt) {
  dirEnt.getFile('temp.csd',
           { create: true, exclusive: false },
           function (fileEnt) { tempCsdFileEntry = fileEnt; },
           handleError);
}

function initFileSystem() {
  var requestFileSystem = window.webkitRequestFileSystem ||
      window.requestFileSystem;
  requestFileSystem(TEMPORARY, 0, setUpFs, handleError);
}

window.onload = function() {
  initFileSystem();
  configureEditor();
  configureControls();
  unsetDirty();
  document.querySelector('#filename').innerText = 'untitled.csd';
};
