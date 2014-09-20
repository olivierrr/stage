;function Field(container) {

	var WIDTH = container.offsetWidth
	var HEIGHT = container.offsetHeight

	var POINT_SPACING = 40

	var LINE_COLOUR = 0xA7A7A7
	var LINE_WIDTH = 1
	var LINE_ALPHA = 0.5

	var DISTANCE_THRESHOLD_MIN = 100

	var ROWS = Math.ceil(HEIGHT / POINT_SPACING)
	var COLS = Math.ceil(WIDTH / POINT_SPACING)

	console.log(WIDTH, HEIGHT)

	var DISTANCE_THRESHOLD = 300
	var SPEED_DIVISOR = 20
	var FRICTION = 0.90

	//

	var isRunning = true

	var _stage = new PIXI.Stage(0xFFFFFF, true)
	_stage.buttonMode = true

	var _renderer = PIXI.autoDetectRenderer(WIDTH, HEIGHT, null, true)
	container.appendChild(_renderer.view)

	var _mouseIsDown = false
	var _mouseX = 0
	var _mouseY = 0

	var _points = []

	var _mask = new PIXI.Graphics()

	var _target = new PIXI.DisplayObjectContainer()
	_stage.addChild(_target)
	_target.mask = _mask

	var _lines = new PIXI.Graphics()
	_target.addChild(_lines)

	//

	_stage.mousedown = _stage.touchstart = onMouseDown
	_stage.mousemove = _stage.touchmove = onMouseMove
	_stage.mouseup = _stage.touchend = onMouseUp
	function onMouseDown() {
		_mouseIsDown = true
	}
	function onMouseMove(e) {
		var mouse = e.getLocalPosition(_stage)
		_mouseX = mouse.x
		_mouseY = mouse.y
	}
	function onMouseUp() {
		_mouseIsDown = false
	}

	//

	function init() {
		var point
		_points = []

		for(var i=0; i<ROWS; i++) {
			_points.push([])

			for(var j=0; j<COLS; j++) {
				point = new PIXI.DisplayObjectContainer()

				point.origX = point.x = i%2 ? ((POINT_SPACING*j)+(POINT_SPACING/2)) : POINT_SPACING*j
				point.origY = point.y = POINT_SPACING*i

				point.velX = point.velY = 0

				_points[i].push(point)
				_target.addChild(point)
			}
		}
	}

	function animate() {
		if(isRunning) {
			update()
			draw()
		}
		requestAnimFrame(animate)
	}

	function update() {
		updatePoints()
		updateLines()
	}
	function draw() {
		_renderer.render(_stage)
	}

	//

	function updatePoints() {
		var distance, num_points, row, point, inMouseRange, distX, distY, gotoX, gotoY

		for (var j = 0; j < _points.length; j++) {
			row = _points[j]
			num_points = row.length

			for (var i = 0; i < num_points; i++) {
				point = row[i]
				inMouseRange = false

				if (_mouseIsDown) {
					distance = getDistance(point.x, point.y, _mouseX, _mouseY)
					if (distance < DISTANCE_THRESHOLD && distance > DISTANCE_THRESHOLD_MIN ) {
						inMouseRange = true
						gotoX = _mouseX
						gotoY = _mouseY
					}
				}

				if (!inMouseRange) {
					gotoX = point.origX
					gotoY = point.origY
				}

				distX = (point.x - gotoX)
				distY = (point.y - gotoY)

				if (inMouseRange) {
					distX *= -1 / (distance/100)
					distY *= -1 / (distance/100)
				}

				point.velX += (distX / SPEED_DIVISOR) * getSigmoid((((distance||1)/(DISTANCE_THRESHOLD/100))/100))
				point.velY += (distY / SPEED_DIVISOR) * getSigmoid((((distance||1)/(DISTANCE_THRESHOLD/100))/100))

				point.x -= point.velX 
				point.y -= point.velY

				point.velX *= FRICTION
				point.velY *= FRICTION
			}
		}
	}

	function updateLines() {
		_lines.clear()
		_lines.lineStyle(LINE_WIDTH, LINE_COLOUR, LINE_ALPHA)

		var num_points, row, point, linkedPoint

		for (var j = 0; j < _points.length; j++) {
			row = _points[j]
			num_points = row.length
			for (var i = 0; i < num_points; i++) {
				point = row[i]

				if (i !== 0) assembleLine(point, row[i-1])

				if (j !== 0) {
					assembleLine(point, _points[j-1][i])
					if (j%2===0 && i!==0) assembleLine(point, _points[j-1][i-1])
					if(i!==num_points-1 && j%2!==0) assembleLine(point, _points[j-1][i+1])
				}
			}
		}
	}

	function assembleLine(point1, point2) {
		_lines.moveTo(point1.x, point1.y)
		_lines.lineTo(point2.x, point2.y)
	}

	function getDistance(x1, y1, x2, y2) {
		var xs = x1 - x2
		var ys = y1 - y2
		return Math.sqrt((xs*xs)+(ys*ys))
	}

	function getSigmoid(t) {
    	return 1/(1+Math.pow(Math.E, -t))
	}

	requestAnimFrame(animate)
	init()

	return {
		resume: function() { isRunning = true },
		pause: function() { isRunning = false},
		distance: function(newDistance, newMin) { DISTANCE_THRESHOLD = newDistance; DISTANCE_THRESHOLD_MIN = newMin },
		friction: function(newValue) { FRICTION = newValue },
		tension: function(newValue) { SPEED_DIVISOR = newValue },
		click: function(x, y, distance, distanceMin) {
			DISTANCE_THRESHOLD = distance
			DISTANCE_THRESHOLD_MIN = distanceMin
			onMouseDown()
			_mouseX = x
			_mouseY = y
		},
		plusOneFrame: function() {
			if(isRunning) return
			update()
			draw()
		},
		reset: function() {
			init()
		},
		pointSpacing: function(newValue) {
			POINT_SPACING = newValue
			ROWS = Math.ceil(HEIGHT / POINT_SPACING)
			COLS = Math.ceil(WIDTH / POINT_SPACING)
			init()
		},
		getWidth: function() {
			return WIDTH
		},
		getHeight: function() {
			return HEIGHT
		}
	}
}