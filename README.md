<h1 align="center"> HuoneKalenteri </h1>

<p align="center"><img src="img/kalenteri.png"/></p>

---

<h3> Download </h3>
<a href="https://codeload.github.com/nesterinen/HuoneKalenteri/zip/refs/heads/main"> Download(.zip) </a>

<p>Then login to your wordpress admin site, and go to the plugins page ~/wp-admin/plugins.php</p>
<ol>
  <li><img src="img/adNewPlug.png"></li>
  <li><img src="img/upldNewPlug.png"></li>
  <li><img src="img/brwsNewPlug.png"></li>
  <li><img src="img/selectNewPlug.png"></li>
  <li><img src="img/wppluginmarked.png"/></li>
</ol>

---

<h3> -Changing which rooms are available- </h3>
<p>List of rooms and their respective display colors are hard coded into index.php as a global variable. &#129318;</p>
<p>To access and modify index.php in wordpress/wp-admin/plugin-editor.php</p>
<ul>
  <li>
    <h3>DISABLE PLUGIN BEFORE EDITING FILES.</h3>
    <p>Go to plugin file editor</p>
    <img src="img/wppluginbdropdown.png">
  </li>
  <li>
    <p>Select TilaKalenteri</p>
    <img src="img/wpselectpluginfile.png">
  </li>
  <li>
    <p>Find "global $huone_available_rooms;" variable</p>
    <img src="img/wpeditpluginfile.png">
  </li>
  <li>
    <p>Example: 'Kellari' => <span style="color:#00E9ED">'#00E9ED'</span> | 'nameOfRoom' => '#hexColor'</p>
    <img src="img/wpeditphpaddline.png">
  </li>
  <li>
    <p>Click Update to save changes.</p>
    <img src="img/wpupdatefile.png">
  </li>
  <li>
    <h3>ENABLE PLUGIN AGAIN HERE</h3>
    <p>Calendar now has a new option</p>
    <img src="img/wpkalenterinewadded.png">
  </li>
</ul>

---