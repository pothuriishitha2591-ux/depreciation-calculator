const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const methods = require('./methods');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ✅ Common input validation
function validateInputsCommon(payload) {
  const errors = [];
  const cost = Number(payload.cost);
  const salvage = Number(payload.salvage);
  const life = Number(payload.life);

  if (!Number.isFinite(cost) || cost <= 0) errors.push('Cost must be a positive number (in ₹).');
  if (!Number.isFinite(salvage) || salvage < 0) errors.push('Salvage value must be zero or positive (in ₹).');
  if (Number.isFinite(cost) && Number.isFinite(salvage) && salvage >= cost)
    errors.push('Salvage value must be less than cost.');
  if (!Number.isInteger(life) || life <= 0) errors.push('Useful life must be an integer greater than 0 (years).');

  return errors;
}

// ✅ Straight-Line Method
app.post('/api/straight-line', (req, res) => {
  const errs = validateInputsCommon(req.body);
  if (errs.length) return res.status(400).json({ errors: errs });
  const { cost, salvage, life, round = 0, partial = 1 } = req.body;
  const rows = methods.calcStraight(cost, salvage, life, partial, round);
  res.json({ rows });
});

// ✅ Declining-Balance Method (safe defaults)
app.post('/api/declining-balance', (req, res) => {
  const errs = validateInputsCommon(req.body);
  let { factor = 2, partial = 1, round = 0 } = req.body;
  factor = Number(factor);
  partial = Number(partial);
  round = Number(round);

  if (!Number.isFinite(factor) || factor <= 0) factor = 2;
  if (!Number.isFinite(partial) || partial < 0 || partial > 1) partial = 1;
  if (errs.length) return res.status(400).json({ errors: errs });

  const rows = methods.calcDeclining(req.body.cost, req.body.salvage, req.body.life, factor, partial, round);
  res.json({ rows });
});

// ✅ SYD Method
app.post('/api/syd', (req, res) => {
  const errs = validateInputsCommon(req.body);
  const { partial = 1, round = 0 } = req.body;
  if (!Number.isFinite(Number(partial)) || partial < 0 || partial > 1)
    errs.push('Partial first year must be between 0 and 1.');
  if (errs.length) return res.status(400).json({ errors: errs });
  const rows = methods.calcSYD(req.body.cost, req.body.salvage, req.body.life, partial, round);
  res.json({ rows });
});

// ✅ Units of Production (safe default units)
app.post('/api/units-production', (req, res) => {
  const errs = validateInputsCommon(req.body);
  let { units = [], total = 0, round = 0 } = req.body;
  const life = Number(req.body.life);

  if (!Array.isArray(units) || units.length === 0) {
    // default equal production
    units = Array(life).fill(100 / life);
    total = 100;
  }
  if (!Number.isFinite(total) || total <= 0) total = units.reduce((a, b) => a + (Number(b) || 0), 0);
  if (total <= 0) errs.push('Total production cannot be zero.');
  if (errs.length) return res.status(400).json({ errors: errs });

  const rows = methods.calcUnits(req.body.cost, req.body.salvage, life, units, total, round);
  res.json({ rows });
});

// ✅ Port setup
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running successfully at http://localhost:${PORT}`);
});
