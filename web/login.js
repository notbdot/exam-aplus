import { api } from './api.js';

const $ = id => document.getElementById(id);
const form = $('authForm');
const status = $('authStatus');
const submit = $('submit');
const password = $('password');

function say(text, error = false) {
  status.textContent = text;
  status.className = error ? 'status error' : 'status';
  if (error && password) password.setAttribute('aria-invalid', 'true');
  else if (password) password.removeAttribute('aria-invalid');
}

async function enroll() {
  const token = location.hash.slice(1);
  history.replaceState(null, '', '/enroll');
  if (!token) {
    say('Setup link is missing. Ask the owner for a new setup link.', true);
    submit.disabled = true;
    return;
  }
  submit.disabled = true;
  try {
    await api('/api/enroll', { token });
    say('Private setup authorized. Choose your password below.');
    submit.disabled = false;
    password.focus();
  } catch (e) {
    say(e.message, true);
  }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  submit.disabled = true;
  say(form.dataset.mode === 'setup' ? 'Setting password…' : 'Signing in…');
  try {
    await api(`/api/${form.dataset.mode}`, { password: password.value });
    location.href = '/';
  } catch (err) {
    say(err.message, true);
    submit.disabled = false;
    password.focus();
  }
});

if (location.pathname === '/enroll') enroll();
