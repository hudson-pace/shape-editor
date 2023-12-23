const drawCanvas = (canvas, context) => {
  drawBox(context, 'whitesmoke', 'black', [0, 0], [canvas.width, canvas.height]);
}
const drawBox = (context, fillStyle, strokeStyle, boxStart, boxEnd) => {
  context.fillStyle = fillStyle;
  context.fillRect(boxStart[0], boxStart[1], boxEnd[0] - boxStart[0], boxEnd[1] - boxStart[1]);
  context.strokeStyle = strokeStyle;
  context.beginPath();
  context.moveTo(boxStart[0], boxStart[1]);
  context.lineTo(boxEnd[0], boxStart[1]);
  context.lineTo(boxEnd[0], boxEnd[1]);
  context.lineTo(boxStart[0], boxEnd[1]);
  context.lineTo(boxStart[0], boxStart[1]);
  context.closePath();
  context.stroke();
}
const canvasUtils = {
  drawCanvas,
  drawBox,
}

export default canvasUtils;