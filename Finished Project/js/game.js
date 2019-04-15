// G00332746 - Maciej Majchrzak
// References:   https://github.com/shakiba/planck.js
//               https://github.com/victordibia/handtrack.js/

const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let trackButton = document.getElementById("trackbutton");
let stats = document.getElementById("stats");

//  Stats values
var score = 0;
var lives = 3;

//  Handtracking variables
let isVideo = false;
let model = null;
let videoInterval = 100

$(".pauseoverlay").show()
$(".overlaycenter").animate({
    opacity: 1,
    fontSize: "4vw"
}, pauseGameAnimationDuration, function () {});

//  Model parameters
const modelParams = {
    flipHorizontal: true, // flip e.g for video  
    maxNumBoxes: 1, // maximum number of boxes to detect
    iouThreshold: 0.5, // ioU threshold for non-max suppression
    scoreThreshold: 0.6, // confidence threshold for predictions.
}

//  Start recording
function startVideo() {
    handTrack.startVideo(video).then(function (status) {
        if (status) {
            isVideo = true
            runDetection()
        }
    });
}

//  Turn on / Turn off video
function toggleVideo() {
    if (!isVideo) {
        startVideo();
    } else {
        handTrack.stopVideo(video)
        isVideo = false;
    }
}

trackButton.addEventListener("click", function () {
    toggleVideo();
});

//  Run detection
function runDetection() {
    model.detect(video).then(predictions => {
        // Get the middle x value of the bounding box and map to paddle location
        model.renderPredictions(predictions, canvas, context, video);
        if (predictions[0]) {
            let midval = predictions[0].bbox[0] + (predictions[0].bbox[2] / 2)
            gamex = document.body.clientWidth * (midval / video.width)
            updatePaddleControl(gamex)
        }
        if (isVideo) {
            setTimeout(() => {
                runDetection(video)
            }, videoInterval);
        }
    });
}

// Load the model
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image
    model = lmodel
    trackButton.disabled = false

    $(".overlaycenter").animate({
        opacity: 0,
        fontSize: "0vw"
    }, pauseGameAnimationDuration, function () {
        $(".pauseoverlay").hide()
    });
});

// TestBed Details
windowHeight = $(document).height()
windowWidth = document.body.clientWidth

let windowXRange, worldXRange = 0
let paddle
let Vec2
let accelFactor

//  Boundary details
var scale_factor = 25
var SPACE_WIDTH = windowWidth / scale_factor;
var SPACE_HEIGHT = windowHeight / scale_factor;
var pauseGameAnimationDuration = 500;

accelFactor = 0.042 * SPACE_WIDTH;
windowHeight = window.innerHeight
windowWidth = window.innerWidth

function updatePaddleControl(x) {
    let mouseX = convertToRange(x, windowXRange, worldXRange);
    let lineaVeloctiy = Vec2((mouseX - paddle.getPosition().x) * accelFactor, 0)
    lineaVeloctiy.x = isNaN(lineaVeloctiy.x) ? 0 : lineaVeloctiy.x
    paddle.setLinearVelocity(lineaVeloctiy)
}

//  Testbed - where game details are defined
planck.testbed('Break Bricks', function(testbed) {
    var pl = planck;
    Vec2 = pl.Vec2;

    var world = pl.World(Vec2(0, -30));

    //  Tesbed details
    testbed.width = 20;
    testbed.height = 30;
    testbed.y = 0;
    windowXRange = [0, windowWidth]
    worldXRange = [-10, 10]

  testbed.keydown = function() {
    if (testbed.activeKeys.fire) {
      if(state.state == 'gameover') {
        state.initGame();
      } else if (state.state == 'ready') {
        state.startGame();
      }
    }
  };

  //    Define physics and state variables
  var physics = new Physics();
  var state = new State();

  function State() {
    var state = this;

    state.state = '';

    // Initial values
    var _time = 0;
    var _createRowTime = 0;
    var _balls = [];
    var _bricks = [];

    // Paddle speed
    function paddleSpeed() {
        return 18;
    }

    // Ball speed
    function ballSpeed() {
        return 6;
    }

    // Time after which new row is created
    function createRowTime() {
        return 20000;
    }

    // Add new ball
    function addBall(ball) {
        _balls.push(ball);
        ball.speed = ballSpeed();
        physics.addBall(ball);
    }

    function paddle() {
        physics.paddle();
    }

    // Add brick
    function addBrick(brick) {
        _bricks.push(brick);
        physics.addBrick(brick);
    }

    // Create new row
    function createRow() {
        _createRowTime = _time + createRowTime();

        var gameover = false;
        _bricks.forEach(function(brick) {
            brick.j++;
            physics.updateBrick(brick);
            gameover = gameover | brick >= 10;
        });

        for (var i = 0; i < 7; i++) {
            if (Math.random() < 0.1) {
                continue;
            }

            var one = 3 + 1, four = Math.max(0, 3 * 1.1 - 60);
            if (Math.random() < one / (four + one)) {
                addBrick({type: 'normal', i: i, j: 0});
            } 
            else {
                addBrick({type: 'small', i: i - 0.25, j: -0.25});
                addBrick({type: 'small', i: i + 0.25, j: -0.25});
                addBrick({type: 'small', i: i - 0.25, j: +0.25});
                addBrick({type: 'small', i: i + 0.25, j: +0.25});
            }
        }

        if (gameover) {
        endGame();
        }
    }

    testbed.step = function(t) {
      _time += t = Math.min(t, 50);

      if (state.state !== 'playing' && state.state !== 'ready') {
        return;
      }

      if (testbed.activeKeys.left && !testbed.activeKeys.right) {
        physics.movePaddle(-paddleSpeed() * t / 1000);

      } else if (!testbed.activeKeys.left && testbed.activeKeys.right) {
        physics.movePaddle(+paddleSpeed() * t / 1000);
      }
      
      if (state.state !== 'playing') {
        return;
      }

      if (_createRowTime && _time > _createRowTime) {
        _createRowTime = 0;
        createRow();
      }

      physics.tick(t);
    };

    state.hitBrick = function(brick) {
      if (!removeFromArray(_bricks, brick)) return;
      physics.removeBrick(brick);

      !_bricks.length && createRow();
      ++score;
      stats.innerText = "Score: " + score + " Lives: " + lives;
    };

    state.hitBall = function() {
    };

    state.missBall = function(ball) {

      if (lives == 0) {
        endGame();
      } else {
          --lives;
          stats.innerText = "Score: " + score + " Lives: " + lives;
      }
    };

    function endGame() {
      state.state = 'gameover';
      physics.endGame();
    }

    state.startGame = function() {
      state.initGame();
      physics.startGame();
      state.state = 'playing';
    };

    state.initGame = function() {
      if (state.state == 'ready') return;
      state.state = 'ready';
      _createRowTime = 0;
      physics.initGame();
      addBall({});
      createRow();
      createRow();
      createRow();
    };
  } //  State()

  function Physics() {
    var pl = planck, Vec2 = pl.Vec2;

    var world = this.world = new pl.World();

    var bottomWall, balls = [], bricks = [];

    var BALL = 1, WALL = 2, BRICK = 4, DROP = 8, PADDLE = 16;

    var ballFix = {
      friction: 0.0,
      restitution: 1.0,
      filterCategoryBits: BALL,
      filterMaskBits: PADDLE | WALL | BRICK
    };

    var paddleFix = {filterCategoryBits: PADDLE, filterMaskBits: BALL | DROP};
    var wallFix = {filterCategoryBits: WALL, filterMaskBits: BALL | DROP};
    var brickFix = {filterCategoryBits: BRICK, filterMaskBits: BALL};

    var ballShape = pl.Circle(0.5);
    var normalBrickShape = pl.Box(1.9 / 2, 1.9 / 2);
    var smallBrickShape = pl.Box(0.9 / 2, 0.9 / 2);

    var fullPaddleShape  = pl.Box(3, 0.5);
    fullPaddleShape.paddleWidth = 3.6;

    world.on('pre-solve', function(contact) {
      var fA = contact.getFixtureA(), bA = fA.getBody();
      var fB = contact.getFixtureB(), bB = fB.getBody();

      var ball = bA.isBall && bA || bB.isBall && bB;
      var brick = bA.isBrick && bA || bB.isBrick && bB;
      var bottom = bA.isBottom && bA || bB.isBottom && bB;
      var paddle = bA.isPaddle && bA || bB.isPaddle && bB;

      // do not change world immediately
      setTimeout(function() {
        if (ball && brick) {
          state.hitBrick(brick.getUserData());

        } else if (ball && bottom) {
          state.missBall(ball.getUserData());

        } else if (ball && paddle) {
          state.hitBall(ball.getUserData());

        }
      }, 1);
    });

    function createPaddle(shape) {
      var p, v;
      if (paddle) {
        p = paddle.getPosition();
        v = paddle.getLinearVelocity();
        world.destroyBody(paddle);
      }

      paddle = world.createKinematicBody({
        position: Vec2(0, -10.5)
      });
      paddle.paddleWidth = shape.paddleWidth;
      paddle.createFixture(shape, paddleFix);
      paddle.isPaddle = true;
      paddle.render = {
            fill: 'blue',
            stroke: 'black'
        }

      p && paddle.setPosition(p);
      v && paddle.setLinearVelocity(v);
    }

    function createBall(pos) {
      var body = world.createDynamicBody({
        bullet: true,
        angle: Math.random() * Math.PI * 2,
        position: pos
      });
      body.createFixture(ballShape, ballFix);
      body.render = {
            fill: 'white',
            stroke: 'white'
        }
      body.isBall = true;
      balls.push(body);
      return body;
    }

    function createBrick(shape, pos) {
      var body = world.createBody(pos);
      body.createFixture(shape, brickFix);
      body.isBrick = true;
      body.render = {
            fill: getRandomColor(),
            stroke: 'white'
        }
      bricks.push(body);
      return body;
    }

    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    this.removeBrick = function(brick) {
      if (!removeFromArray(bricks, brick.body)) return;
      world.destroyBody(brick.body);
    };

    this.removeBall = function(ball) {
      if (!removeFromArray(balls, ball.body)) return;
      world.destroyBody(ball.body);
    };

    this.updateBrick = function(brick) {
      brick.body.setPosition(Vec2((brick.i - 3) * 2, 9 - brick.j * 2));
    };

    this.addBrick = function(brick) {
      var shape = brick.type == 'small' ? smallBrickShape : normalBrickShape;
      var pos = Vec2((brick.i - 3) * 2, 9 - brick.j * 2);
      var body = brick.body = createBrick(shape, pos);
      body.setUserData(brick);
    };

    this.addBall = function(ball) {
      var body = ball.body = createBall();
      body.setUserData(ball);

      var oldball = balls[0];
      if (oldball) {
        body.setPosition(oldball.getPosition());
        body.setLinearVelocity(Vec2(oldball.getLinearVelocity()).mul(-1));
      } else {
        body.setPosition(Vec2(0, -5));
      }
    };

function createWorld() {

      world.createBody(Vec2(+9, -0.5))
        .createFixture(pl.Edge(Vec2(0, -12.5), Vec2(0, +11.5)), wallFix);

      world.createBody(Vec2(-9, -0.5))
        .createFixture(pl.Edge(Vec2(0, -12.5), Vec2(0, +11.5)), wallFix);

      world.createBody(Vec2(0, +12))
        .createFixture(pl.Edge(Vec2(-8, 0), Vec2(+8, 0)), wallFix);

      world.createBody(Vec2(9, 12))
        .createFixture(pl.Edge(Vec2(-1, 0), Vec2(0, -1)), wallFix);

      world.createBody(Vec2(-9, 12))
        .createFixture(pl.Edge(Vec2(1, 0), Vec2(0, -1)), wallFix);

      bottomWall = world.createBody(Vec2(0, -13));
      bottomWall.createFixture(pl.Edge(Vec2(-9, 0), Vec2(+9, 0)), wallFix);
      bottomWall.isBottom = true;
    }

    this.paddle = function() {
      createPaddle(fullPaddleShape);
    };

    this.movePaddle = function(dir) {
      var p = paddle.getPosition();
      p = Vec2(dir, 0).add(p);
      p.x = Math.min(9 - paddle.paddleWidth / 2, Math.max(-(9 - paddle.paddleWidth / 2), p.x))
      paddle.setPosition(p);
    };

    this.tick = function(t) {
    };

    this.endGame = function() {
      world.destroyBody(paddle);
    };

    this.startGame = function() {
      var ball = balls[0];
      var a = Math.PI * Math.random() * 0.4 - 0.2;
      var speed = ball.getUserData().speed;
      ball.setLinearVelocity(Vec2(speed * Math.sin(a), speed * Math.cos(a)));
    };

    this.initGame = function() {
      balls.forEach(function(body) {
        world.destroyBody(body);
      });

      bricks.forEach(function(body) {
        world.destroyBody(body);
      });

      createPaddle(fullPaddleShape);    //  create paddle
      createWorld();    // create surrounding boundary
    };

    
  } //  Physics()

  state.initGame(); //  initilize game

  //    Function to remove item from an array
  function removeFromArray(array, item) {
    var i = array.indexOf(item);
    if (i == -1) {
      return false;
    } else {
      array.splice(i, 1);
      return true;
    }
  }

  return physics.world;
});

//  Boundary range function
function convertToRange(value, srcRange, dstRange) {
    // Value is outside source range return
    if (value < srcRange[0] || value > srcRange[1]) {
        return NaN;
    }

    var srcMax = srcRange[1] - srcRange[0],
        dstMax = dstRange[1] - dstRange[0],
        adjValue = value - srcRange[0];

    return (adjValue * dstMax / srcMax) + dstRange[0];

}

//  Key listener
document.body.onkeyup = function(e){
    if(e.keyCode == 82){
        location.reload();
    }
}