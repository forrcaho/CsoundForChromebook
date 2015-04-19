# CsoundForChromebook
A Chrome App for editing and playing Csound files, so Csound can be used on a Chromebook.

This app uses the PNaCl version of Csound. PNaCl is a kind of sandboxed executable that runs
inside of Chrome. It has some limitations, but runs on the Chromebook, which is why it is
being used here. More information about PNaCl Csound can be found at http://vlazzarini.github.io/.

Although this app uses CSD formatted files, due to the API I had available, and what I was able
to make work from it, the code here extracts the orchestra and score sections from the CSD and
sends these to Csound individually.

There is an API call to send a file to Csound by name, but this requires that the html5fs file
system compiled into the Csound PNaCl be used. This is a filesystem whose names are obfuscated
from external apps. For loading and saving CSDs, I used the OSes native filesystem so that you can
work with them outside of this app as you would expect. Unfortunately, PNaCl's sandboxing
requirements mean it isn't able to read these files directly. I tried to access the html5fs
filesystem and transfer files there temporarily to be played, but I didn't get this to work;
interested developers can check out the use_csound_fs git branch to see what I had.

A "Render CSD to file" button exists but is permanently disabled. Getting this to work would
depend on me getting the html5fs trick to work, and I don't know when or if that will happen.

For now, the Csound output is only being logged to the console. To get to the console for a Chrome
app, enter the URL chrome://inspect into Chrome and find the running app under the Apps menu.

The next step is to have a tabbed interface to support having multiple files open, and have the
Csound output in one of the tabbed panes.



