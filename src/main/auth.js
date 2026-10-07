'use strict';
const crypto = require('crypto');

const ITER = 210000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, ITER, 32, 'sha256').toString('hex');
  return { salt, hash, iter: ITER };
}

function verifyPassword(password, salt, hash, iter = ITER) {
  if (!salt || !hash) return false;
  const test = crypto.pbkdf2Sync(String(password), salt, iter, 32, 'sha256');
  const ref = Buffer.from(hash, 'hex');
  return ref.length === test.length && crypto.timingSafeEqual(ref, test);
}

module.exports = { hashPassword, verifyPassword };
