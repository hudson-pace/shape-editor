const editor = document.querySelector('#editor');
const game = document.querySelector('#game');
const switchToEditorButton = document.querySelector('#switch-to-editor-button');
switchToEditorButton.addEventListener('click', () => {
    game.style.display = 'none';
    editor.style.display = 'block';
});

const canvas = document.querySelector('#game-container');
canvas.width = 1500;
canvas.height = 600;
const context = canvas.getContext('2d');
const draw = () => {
  context.fillStyle = 'whitesmoke';
  context.strokeStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(canvas.width, 0);
  context.lineTo(canvas.width, canvas.height);
  context.lineTo(0, canvas.height);
  context.closePath();
  context.stroke();
}
draw();