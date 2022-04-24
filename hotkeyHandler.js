function hotkeyHandler(event) {
  const keyCode = event.keyCode;
  const key = event.key;

  if ((keyCode >= 16 && keyCode <= 18) || keyCode === 91 || keyCode === 9) return;

  const value = [];
  event.ctrlKey ? value.push('Control') : null;
  event.shiftKey ? value.push('Shift') : null;
  event.altKey ? value.push('Alt') : null;
  value.push(key.toUpperCase());

  document.getElementById('hotkey').value = value.join('+');
}
