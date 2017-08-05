var audioCTX;
function initAudio() {
  try {
    // Fix up for prefixing
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    audioCTX = new AudioContext();
  }
  catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
}

var sounds = {};
var loadSound = function(key, url) {
  if (audioCTX != null) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    var soundBuffer;
    request.onload = function() {
      audioCTX.decodeAudioData(request.response, function(buffer) {
        soundBuffer = buffer;
        sounds[key] = soundBuffer;
      });
    }
    request.send();
  }
};

var playSound = function(key, loop) {
  if (sounds[key]) {
    if (!audioCTX.createGain)
      audioCTX.createGain = audioCTX.createGainNode;

    var gainNode = audioCTX.createGain();

    var source = audioCTX.createBufferSource();
    source.buffer = sounds[key];
    source.connect(gainNode);
    if (loop) {
      source.loop = true;
    }

    // Connect the source to the gain node.
    source.connect(gainNode);
    // Connect the gain node to the destination.
    gainNode.connect(audioCTX.destination);
    source.start(0);
    source.gainNode = gainNode;
    return source;
  } else {
    console.warn("No sound with key "+key);
    return null;
  }
};

var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');

var circleColours = [
  '#D94263',
  '#FE9A4C',
  '#EBCC4F',
  '#6FA87B',
  '#678CA6',
  '#ADD578',
  '#F2FF95',
  '#FFBD95',
  '#FFB56A',
  '#F26C4F',
  '#3A89C9',
  '#E9F2F9',
  '#9CC4E4',
  '#1B325F'
];

var backgroundColours = [
  '#020109',
  '#2E2B24',
  '#001848',
  '#20293F',
  '#404749',
  '#1C0B2B',
  '#301C41'
];

var nextColour = function() {
  colourIndex++;
  if (colourIndex == circleColours.length) {
    colourIndex = 0;
  }
  setColours();
};

var setColours = function() {
  backgroundColour = backgroundColours[Math.floor(Math.random() * backgroundColours.length)];
  circleColour = circleColours[Math.floor(Math.random() * circleColours.length)];
};

var backgroundColour = "#000000";
var circleColour = "#ffffff";
var lastColourChangeTime = timestamp();
var colourChangeFrequency = 10;
var colourChangeWaitTime = (60 * 1000) / colourChangeFrequency;
var colourIndex = 0;
setColours();

var keys = {};
var keycodes = {
  up: 38,
  down: 40,
  left: 37,
  right: 39,
  f: 70
};

var scale = 1;
var velocity = {
  x: 0,
  y: 0
};
var acceleration = 0.1;
var frictionMag = 0.5;
var frictionAmount = acceleration * frictionMag;

var fps = 60;
var frameTime = 1000 / fps;
var lastFrameTime = 0;

var difficulty = 0;
var defaultDifficultyChangeAmount = 0.1;
var difficultyAcceleration = 0.1;
var difficultyDownAmount = defaultDifficultyChangeAmount;
var difficultyUpAmount = defaultDifficultyChangeAmount;
var lastWasGood = false;
var lastWasBad = false;
var maxDifficulty = 1;
var minDifficulty = 0;
var maxWaveFrequency = 480 * 3;
var minWaveFrequency = 480 * 0.1;
var waveWaitTime;

var recalculateWaveTime = function() {
  var freq = minWaveFrequency + difficulty * (maxWaveFrequency - minWaveFrequency);
  waveWaitTime = (1000 * 60) / freq;
};
recalculateWaveTime();

var onHitWave = function() {
  for (var i = 0; i < waves.length; i++) {
    waves[i].kill();
  };
  waves = [];
  pickup.moveAway();

  if (lastWasBad) {
    difficultyDownAmount += difficultyAcceleration;
  } else {
    difficultyDownAmount = difficultyUpAmount + 0;
  }

  difficulty -= difficultyDownAmount;
  if (difficulty < minDifficulty) {
    difficulty = minDifficulty;
  }
  if (!lastWasBad) {
    difficultyDownAmount = defaultDifficultyChangeAmount;
  }
  console.log('changed difficulty by ' + difficultyDownAmount + ' to ' + difficulty);
  recalculateWaveTime();

  lastWasBad = true;
  lastWasGood = false;

  nextColour();
};

var onHitBall = function() {
  if (lastWasGood) {
    difficultyUpAmount += difficultyAcceleration;
  } else {
    difficultyUpAmount = difficultyDownAmount + 0;
  }

  difficulty += difficultyUpAmount;
  if (difficulty > maxDifficulty) {
    difficulty = maxDifficulty;
  }
  if (!lastWasGood) {
    difficultyUpAmount = defaultDifficultyChangeAmount;
  }
  console.log('changed difficulty by ' + difficultyUpAmount + ' to ' + difficulty);
  recalculateWaveTime();

  lastWasGood = true;
  lastWasBad = false;
};

var waves = [];
var waveRadius = 600;
var waveSpeed = 1;
//number of waves per minute
var lastWaveTime = timestamp();
var waveDeadZoneRadius = 150;
var waveSpawnRadius = 1080 * 1.5;
var waveHeightSpeed = 0.005;
var moveSpeed = 5;
var playerRadius = 12;
var hearingRange = 200;
var hearingPower = 1.5;
var clueTextStartTime = 0;

var pickup = {
  x: 0,
  y: 0,
  radius: 16,
  velocity: {
    x: 0,
    y: 0
  },
  frictionMag: 0.25,
  frictionAmount: this.acceleration * this.frictionMag,
  fleeAcceleration: 0.075,
  chaseAcceleration: 0.05,
  fleeFrictionAmount: this.fleeAcceleration * 0.5,
  chaseFrictionAmount: this.chaseAcceleration * 0.5,
  chaseSpeed: moveSpeed * 1.25,
  fleeSpeed: moveSpeed * 0.25,
  fleeRadius: 350,
  deadZone: 150,
  fleeing: false,

  flee: function() {
    if (this.x > 0) {
      this.velocity.x += this.fleeAcceleration;
      if (this.velocity.x > this.fleeSpeed) {
        this.velocity.x = this.fleeSpeed;
      }
    } else {
      this.velocity.x -= this.fleeAcceleration;
      if (this.velocity.x < -this.fleeSpeed) {
        this.velocity.x = -this.fleeSpeed;
      }
    }

    if (this.y > 0) {
      this.velocity.y += this.fleeAcceleration;
      if (this.velocity.y > this.fleeSpeed) {
        this.velocity.y = this.fleeSpeed;
      }
    } else {
      this.velocity.y -= this.fleeAcceleration;
      if (this.velocity.y < -this.fleeSpeed) {
        this.velocity.y = -this.fleeSpeed;
      }
    }

    this.friction(this.fleeFrictionAmount);

    if (Math.sqrt(this.x*this.x + this.y*this.y) > this.fleeRadius + this.deadZone) {
      this.state = this.chase;
    }

    if (Math.sqrt(this.x*this.x + this.y*this.y) < this.radius + playerRadius) {
      onHitBall();
      this.moveAway();
    }
  },

  chase: function() {
    if (this.x > 0) {
      this.velocity.x -= this.chaseAcceleration;
      if (this.velocity.x < -this.chaseSpeed) {
        this.velocity.y = -this.chaseSpeed;
      }
    } else if (this.x < 0) {
      this.velocity.x += this.chaseAcceleration;
      if (this.velocity.x > this.chaseSpeed) {
        this.velocity.x = this.chaseSpeed;
      }
    }

    if (this.y > 0) {
      this.velocity.y -= this.chaseAcceleration;
      if (this.velocity.y < -this.chaseSpeed) {
        this.velocity.y = -this.chaseSpeed;
      }
    } else if (this.y < 0) {
      this.velocity.y += this.chaseAcceleration;
      if (this.velocity.y > this.chaseSpeed) {
        this.velocity.y = this.chaseSpeed;
      }
    }

    if (Math.sqrt(this.x*this.x + this.y*this.y) < this.fleeRadius) {
      this.state = this.flee;
    }

    this.friction(this.chaseFrictionAmount);
  },

  state: null,

  update: function() {
    this.state();

    this.x += this.velocity.x;
    this.y += this.velocity.y;
  },
  friction: function(amount) {
    if (this.velocity.x > 0) {
      this.velocity.x -= amount;
      if (this.velocity.x < 0) {
        this.velocity.x = 0;
      }
    } else if (this.velocity.x < 0) {
      this.velocity.x += amount;
      if (this.velocity.x > 0) {
        this.velocity.x = 0;
      }
    }

    if (this.velocity.y > 0) {
      this.velocity.y -= amount;
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }
    } else if (this.velocity.y < 0) {
      this.velocity.y += amount;
      if (this.velocity.y > 0) {
        this.velocity.y = 0;
      }
    }
  },
  render: function(midPoint) {
    var x = midPoint.x + this.x;
    var y = midPoint.y + this.y;

    ctx.globalAlpha = 1;
    ctx.fillStyle = this.state == this.flee ? '#ff0000' : '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(
      x*scale,
      y*scale,
      this.radius*scale,
      0,
      2*Math.PI
    );
    ctx.fill();
  },
  moveAway: function() {
    if (Math.random() < 0.5) {
      this.x = (Math.random()-0.5) * canvas.width;
      if (Math.random() < 0.5) {
        this.y = canvas.height * 0.5 + this.radius * 2 + 8;
      } else {
        this.y = -(canvas.height * 0.5 + this.radius * 2 + 8);
      }
    } else {
      this.y = (Math.random()-0.5) * canvas.height;
      if (Math.random() < 0.5) {
        this.x = canvas.width * 0.5 + this.radius * 2 + 8;
      } else {
        this.x = -(canvas.width * 0.5 + this.radius * 2 + 8);
      }
    }

    this.velocity.x = this.velocity.y = 0;
  }
};
pickup.state = pickup.chase;
pickup.fleeFrictionAmount = pickup.fleeAcceleration * 0.5;
pickup.chaseFrictionAmount = pickup.chaseAcceleration * 0.5;
pickup.moveAway();

var delta = 1;
var loop = function() {
  var lastFrameTimeElapsed = (timestamp() - lastFrameTime);
  lastFrameTime = timestamp();
  var delta = lastFrameTimeElapsed / frameTime;
  update(delta);
  render();

  window.requestAnimationFrame(loop);
};

var friction = function() {
  if (velocity.x > 0) {
    velocity.x -= frictionAmount;
    if (velocity.x < 0) {
      velocity.x = 0;
    }
  } else if (velocity.x < 0) {
    velocity.x += frictionAmount;
    if (velocity.x > 0) {
      velocity.x = 0;
    }
  }

  if (velocity.y > 0) {
    velocity.y -= frictionAmount;
    if (velocity.y < 0) {
      velocity.y = 0;
    }
  } else if (velocity.y < 0) {
    velocity.y += frictionAmount;
    if (velocity.y > 0) {
      velocity.y = 0;
    }
  }
};

var fullscreenHint = function() {
  clueTextStartTime = timestamp();
  fadingIn = true;
  clueAlpha = 0;
  clueText = 'F to exit fullscreen.';
  fadedIn = true;
};

var fadingIn = true;
var clueAlpha = 0;
var fadedIn = false;

var loaded = false;
var totalLoaded = 0;
var update = function(delta) {
  if (!loaded) {
    totalLoaded = 0;

    if (sounds['note1']) {totalLoaded++};
    if (sounds['note2']) {totalLoaded++};
    if (sounds['note3']) {totalLoaded++};
    if (sounds['note4']) {totalLoaded++};
    if (sounds['note5']) {totalLoaded++};
    if (sounds['note6']) {totalLoaded++};

    if (totalLoaded == 6) {
      loaded = true;
      clueTextStartTime = timestamp();
    }
  } else {
    if (fadingIn) {
      if (fadedIn) {
        if (timestamp() - clueTextStartTime > 3000) {
          fadingIn = false;
        }
      } else {
        clueAlpha += 0.01 * delta;
        if (clueAlpha >= 1) {
          clueAlpha = 1;
          fadedIn = true;
          clueTextStartTime = timestamp();
        }
      }
    } else {
      clueAlpha -= 0.01 * delta;
      if (clueAlpha <= 0) {
        clueAlpha = 0;
      }
    }

    var x = 0;
    var y = 0;
    if (keys[keycodes.up]) {
      velocity.y += acceleration;
      if (velocity.y > moveSpeed) {
        velocity.y = moveSpeed;
      }
      // playSound('note', true);
    }
    if (keys[keycodes.down]) {
      velocity.y -= acceleration;
      if (velocity.y < -moveSpeed) {
        velocity.y = -moveSpeed;
      }
    }
    if(keys[keycodes.left]) {
      velocity.x += acceleration;
      if (velocity.x > moveSpeed) {
        velocity.x = moveSpeed;
      }
    }
    if(keys[keycodes.right]) {
      velocity.x -= acceleration;
      if (velocity.x < -moveSpeed) {
        velocity.x = -moveSpeed;
      }
    }

    friction();

    for (var i = 0; i < waves.length; i++) {
      waves[i].x+=velocity.x;
      waves[i].y+=velocity.y;

      waves[i].update(delta);
    };

    pickup.x += velocity.x;
    pickup.y += velocity.y;
    pickup.update();

    if (timestamp() - lastWaveTime >= waveWaitTime) {
      lastWaveTime = timestamp();
      spawnWave();
    }

    if (timestamp() - lastColourChangeTime >= colourChangeWaitTime) {
      // nextColour();
      lastColourChangeTime = timestamp();
    }
  }
};

var waveLifeTimes = [];

var spawnWave = function() {
  var x, y;
  if (Math.random() < 0.5) {
    x = waveDeadZoneRadius + Math.random() * (waveSpawnRadius - waveDeadZoneRadius);
  } else {
    x = -(waveDeadZoneRadius + Math.random() * (waveSpawnRadius - waveDeadZoneRadius));
  }

  if (Math.random() < 0.5) {
    y = waveDeadZoneRadius + Math.random() * (waveSpawnRadius - waveDeadZoneRadius);
  } else {
    y = -(waveDeadZoneRadius + Math.random() * (waveSpawnRadius - waveDeadZoneRadius));
  }

  var wave = {
    x: x,
    y: y,
    radius: 0,
    building: true,
    height: 0,
    startTime: timestamp(),
    sound: playSound('note' + (1+Math.floor(Math.random() * 6)).toString()),
    update: function(delta) {
      this.radius += waveSpeed * delta;
      if (this.building) {
        this.height += waveHeightSpeed * delta;
        if (this.height >= 1) {
          this.building = false;
          this.height = 1;
        }

        var dist = Math.sqrt(this.x*this.x, this.y*this.y) - this.radius;

        var volume = ((hearingRange-dist)/hearingRange);
        if (volume > 1) {
          volume = 1;
        } else if (volume < 0) {
          volume = 0;
        }
        volume = Math.pow(volume, hearingPower);
        this.sound.gainNode.gain.value = volume;
      } else {
        this.height -= waveHeightSpeed * delta;
        if (this.height <= 0) {
          this.kill();
        }
      }

      if (this.height > 0.1 && Math.sqrt(this.x*this.x + this.y*this.y) < this.radius) {
        onHitWave();
      }
    },
    render: function(midPoint) {
      var x = midPoint.x + this.x;
      var y = midPoint.y + this.y;

      ctx.globalAlpha = this.height;
      ctx.fillStyle = circleColour;
      ctx.beginPath();
      ctx.arc(
        x*scale,
        y*scale,
        this.radius*scale,
        0,
        2*Math.PI
      );
      ctx.fill();
    },
    kill: function() {
      // var lifetime = (timestamp() - this.startTime);
      // waveLifeTimes.push(lifetime);
      this.sound.gainNode.gain.value = 0;
      waves.splice(waves.indexOf(this), 1);
    }
  }

  waves.push(wave);
}

var clueText = 'Arrow keys to move.';
var render = function() {
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = backgroundColour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (loaded) {
    var midPoint = {
      x: canvas.width * 0.5,
      y: canvas.height * 0.5
    };

    pickup.render(midPoint);

    for (var i = 0; i < waves.length; i++) {
      waves[i].render(midPoint);
    };

    ctx.fillStyle="#FF0000";
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(
      midPoint.x*scale,
      midPoint.y*scale,
      playerRadius*scale,
      0,
      2*Math.PI
    );
    ctx.fill();

    ctx.globalAlpha = clueAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.fillStyle = (30*scale).toString() + "px Verdana";
    ctx.fillText(clueText, 45, 70);
  } else {
    ctx.font="30px Verdana";
    ctx.fillStyle = '#ffffff';
    var text = "Loading... " + totalLoaded.toString() + " out of 6 audio files loaded.";
    ctx.fillText(text, 45, 70);
  }
};

window.onkeyup = function(e) {
  keys[e.keyCode] = false;
};

window.onkeydown = function(e) {
  keys[e.keyCode] = true;
  if (e.keyCode === keycodes.f) {
    toggleFullscreen();
  }
}

var fullscreen = false;
var toggleFullscreen = function() {
  fullscreen = !fullscreen;
  var root = document.getElementById('root');
  if (fullscreen) {
    root.style.position = 'absolute';
    root.style.top = '0px';
    root.style.left = '0px';
    root.style.width = 'calc(100vw)';
    root.style.height = 'calc(100vh)';
    root.style.overflow = 'hidden';
  } else {
    root.style = startStyle;
    root.style.width = '960px';
    root.style.height = '640px';
  }
  resize();
};

function timestamp() {
  if (performance) {
    return performance.now();
  } else {
    return Date.now();
  }
};

var scale = 1;
var resize = function() {
  var root = document.getElementById('root');
  canvas.width = root.clientWidth;
  canvas.height = root.clientHeight;
  scale = canvas.width / 960;
};
window.onresize = resize;

var startStyle;
window.onload = function() {
  resize();
  startStyle = Object.assign({}, root.style);
  lastWaveTime = 0;
  lastFrameTime = timestamp();
  window.requestAnimationFrame(loop);

  initAudio();

  // loadSound('bowl', 'audio/bowl.wav');
  loadSound('note1', './audio/note1.wav');
  loadSound('note2', './audio/note2.wav');
  loadSound('note3', './audio/note3.wav');
  loadSound('note4', './audio/note4.wav');
  loadSound('note5', './audio/note5.wav');
  loadSound('note6', './audio/note6.wav');
} 