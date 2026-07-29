// Crude-but-helpful password score: length + character variety, 0–4.
// Shared so the auth forms and the guest account page grade a password the
// same way — two meters that disagree would be worse than none.
function scorePassword(pw) {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 6) s += 1
  if (pw.length >= 10) s += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1
  if (/\d/.test(pw)) s += 1
  if (/[^A-Za-z0-9]/.test(pw)) s += 1
  return Math.min(s, 4)
}

export { scorePassword }
