window.game_resizeCallback = function() {

};

window.game_fullscreen = false;
window.game_toggleFullscreen = function() {
  window.game_fullscreen = !window.game_fullscreen;
  var root = document.getElementById(window.game_root);
  if (window.game_fullscreen) {
    root.style.position = 'absolute';
    root.style.top = '0px';
    root.style.left = '0px';
    root.style.width = 'calc(100vw)';
    root.style.height = 'calc(100vh)';
    root.style.overflow = 'hidden';
  } else {
    root.style = window.startStyle;
    root.style.width = window.defaultWidth + 'px';
    root.style.height = window.defaultHeight + 'px';
  }
  window.game_resizeCallback();
};

window.addEventListener('keydown', function(e) {
  if (e.keyCode === 70) {
    window.game_toggleFullscreen();
  }
});

window.game_initFullscreenListener = function(root) {
  window.game_root = root;
  var root = document.getElementById(window.game_root);
  window.startStyle = root.style;
  window.defaultWidth = root.clientWidth;
  window.defaultHeight = root.clientHeight;

  console.log(window.defaultWidth, window.defaultHeight);
}