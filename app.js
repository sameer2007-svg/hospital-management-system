/* =====================================================
   MediCare Hospital – app.js
   ===================================================== */

// ─────────────────────────────────────────────────────
// DATA STORE
// ─────────────────────────────────────────────────────
let patients     = JSON.parse(localStorage.getItem('mc_patients'))     || [];
let appointments = JSON.parse(localStorage.getItem('mc_appointments')) || [];
let bills        = JSON.parse(localStorage.getItem('mc_bills'))        || [];
let doctors      = JSON.parse(localStorage.getItem('mc_doctors'))      || [];
let notifications= JSON.parse(localStorage.getItem('mc_notifs'))       || [];

let editApptId   = null;
let editDrId     = null;
let confirmResolve = null;

// Color palette for avatars
const COLORS = ['#1a6ef5','#0ea5a0','#7c3aed','#ea6c00','#dc2626','#16a34a','#0284c7','#9333ea'];

// ─────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
  seedDefaultDoctors();
  seedDemoData();
  updateBadge();
  updateNotifDot();
  renderNotifications();

  // Close dropdowns on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#notifDropdown') && !e.target.closest('.notif-btn'))
      document.getElementById('notifDropdown').classList.add('hidden');
    if (!e.target.closest('#userDropdown') && !e.target.closest('#userAvatar'))
      document.getElementById('userDropdown').classList.add('hidden');
  });

  // BMI calc
  document.getElementById('regHeight').addEventListener('input', calcBMI);
  document.getElementById('regWeight').addEventListener('input', calcBMI);

  // Set today as default date for appt & bill
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('apptDate').value = today;
  document.getElementById('billDate').value = today;
  document.getElementById('regAdmDate').value = today;

  // ── Wire up all real-time field validation ──
  initValidation();
});

function setCurrentDate() {
  const now = new Date();
  document.getElementById('currentDate').textContent =
    now.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}

// ─────────────────────────────────────────────────────
// VALIDATION ENGINE
// ─────────────────────────────────────────────────────

/**
 * Validation rule definitions.
 * Each rule: { ids[], type, required?, label? }
 * Types:
 *   'name'    – letters, spaces, dots, hyphens only (NO digits)
 *   'phone'   – digits, +, -, spaces only (NO letters)
 *   'number'  – digits only
 *   'pincode' – exactly 6 digits
 *   'email'   – standard email format
 *   'alpha'   – letters + spaces only
 *   'alphanumeric' – letters + digits (no special)
 *   'any'     – just required check
 */
const VALIDATION_RULES = [
  // ── Patient Registration – Step 1 ──
  { ids: ['regFirstName', 'regMiddleName', 'regLastName',
          'regEmgName', 'drName'],
    type: 'name',     label: 'Name' },
  { ids: ['regPhone', 'regEmgPhone', 'drPhone',
          'apptPatient'],
    type: 'phone',    label: 'Phone number' },
  { ids: ['regPincode'],
    type: 'pincode',  label: 'Pincode' },
  { ids: ['regAge', 'regHeight', 'regWeight',
          'drExperience'],
    type: 'number',   label: 'Number' },
  { ids: ['regEmail', 'regEmgEmail', 'drEmail'],
    type: 'email',    label: 'Email' },
  { ids: ['regCity'],
    type: 'name',     label: 'City' },
  { ids: ['regIdNumber'],
    type: 'alphanumeric', label: 'ID number' },
];

function initValidation() {
  VALIDATION_RULES.forEach(rule => {
    rule.ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      // ── Block invalid keystrokes in real-time ──
      el.addEventListener('keydown', e => blockKey(e, rule.type));
      el.addEventListener('keypress', e => blockKey(e, rule.type));

      // ── Block paste of invalid content ──
      el.addEventListener('paste', e => {
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        if (!isValidValue(pasted, rule.type)) {
          e.preventDefault();
          showFieldError(el, getErrorMsg(rule.type, rule.label));
        }
      });

      // ── Show/clear error on blur ──
      el.addEventListener('blur', () => validateField(el, rule.type, rule.label));

      // ── Clear error while typing valid content ──
      el.addEventListener('input', () => {
        const val = el.value;
        if (isValidValue(val, rule.type) || val === '') clearFieldError(el);
        else showFieldError(el, getErrorMsg(rule.type, rule.label));
      });
    });
  });
}

/** Blocks a keystroke if it would produce an invalid character */
function blockKey(e, type) {
  // Allow control keys always (backspace, delete, arrows, tab, etc.)
  if (e.ctrlKey || e.metaKey) return;
  const controlKeys = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight',
                       'ArrowUp','ArrowDown','Home','End','Enter','Escape'];
  if (controlKeys.includes(e.key)) return;

  const char = e.key;
  if (!isValidChar(char, type)) {
    e.preventDefault();
    const el = e.target;
    // Shake the field to signal rejection
    el.classList.remove('field-shake');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('field-shake');
    showFieldError(el, getErrorMsg(type, ''));
  }
}

/** Returns true if a SINGLE character is valid for the given type */
function isValidChar(char, type) {
  switch (type) {
    case 'name':  return /^[a-zA-Z .\-']$/.test(char);
    case 'phone': return /^[0-9+\- ]$/.test(char);
    case 'number':return /^[0-9]$/.test(char);
    case 'pincode':return /^[0-9]$/.test(char);
    case 'email': return true; // email allows most chars
    case 'alpha': return /^[a-zA-Z ]$/.test(char);
    case 'alphanumeric': return /^[a-zA-Z0-9 ]$/.test(char);
    default:      return true;
  }
}

/** Returns true if an entire VALUE is valid for the given type */
function isValidValue(val, type) {
  if (!val) return true; // empty is handled separately by 'required'
  switch (type) {
    case 'name':       return /^[a-zA-Z .\-']+$/.test(val);
    case 'phone':      return /^[0-9+\- ]{7,15}$/.test(val.trim());
    case 'number':     return /^\d+(\.\d+)?$/.test(val);
    case 'pincode':    return /^\d{6}$/.test(val);
    case 'email':      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    case 'alpha':      return /^[a-zA-Z ]+$/.test(val);
    case 'alphanumeric': return /^[a-zA-Z0-9 ]+$/.test(val);
    default:           return true;
  }
}

/** Validates a field on blur – shows error or clears it */
function validateField(el, type, label) {
  const val = el.value.trim();
  if (el.required && val === '') {
    showFieldError(el, `${label || 'This field'} is required.`);
    return false;
  }
  if (val && !isValidValue(val, type)) {
    showFieldError(el, getErrorMsg(type, label));
    return false;
  }
  clearFieldError(el);
  return true;
}

/** Human-readable error messages per type */
function getErrorMsg(type, label) {
  const field = label || 'This field';
  switch (type) {
    case 'name':       return `${field} must contain only letters, spaces or hyphens – no numbers allowed.`;
    case 'phone':      return `${field} must contain only digits (0-9), +, or - (no letters or special characters).`;
    case 'number':     return `${field} must be a valid number (digits only).`;
    case 'pincode':    return `Pincode must be exactly 6 digits.`;
    case 'email':      return `Please enter a valid email address (e.g. name@domain.com).`;
    case 'alpha':      return `${field} must contain only letters and spaces.`;
    case 'alphanumeric': return `${field} must contain only letters and digits.`;
    default:           return `Invalid input.`;
  }
}

/** Shows a styled inline error message below an input */
function showFieldError(el, msg) {
  el.classList.add('field-error');
  let errEl = el.parentElement.querySelector('.validation-msg');
  if (!errEl) {
    // If input is inside .input-icon-wrap, attach to parent
    const wrap = el.closest('.input-icon-wrap') || el.parentElement;
    errEl = wrap.querySelector('.validation-msg');
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.className = 'validation-msg';
      wrap.appendChild(errEl);
    }
  }
  errEl.textContent = '⚠ ' + msg;
  errEl.style.display = 'flex';
}

/** Clears the inline error on an input */
function clearFieldError(el) {
  el.classList.remove('field-error', 'field-shake');
  const wrap = el.closest('.input-icon-wrap') || el.parentElement;
  const errEl = wrap.querySelector('.validation-msg');
  if (errEl) errEl.style.display = 'none';
}

/**
 * Validates ALL required & typed fields in a form step.
 * Returns true if valid, false otherwise.
 */
function validateStep(stepEl) {
  let valid = true;
  // Check required fields
  stepEl.querySelectorAll('[required]').forEach(el => {
    if (!el.value.trim()) {
      el.classList.add('field-error');
      el.classList.remove('field-shake');
      void el.offsetWidth;
      el.classList.add('field-shake');
      showFieldError(el, `This field is required.`);
      valid = false;
    }
  });
  // Check validation rules for fields inside this step
  VALIDATION_RULES.forEach(rule => {
    rule.ids.forEach(id => {
      const el = stepEl.querySelector('#' + id);
      if (!el || !el.value.trim()) return;
      if (!isValidValue(el.value.trim(), rule.type)) {
        showFieldError(el, getErrorMsg(rule.type, rule.label));
        valid = false;
      }
    });
  });
  return valid;
}

// ─────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────
function seedDefaultDoctors() {
  if (doctors.length > 0) return;
  const defaults = [
    { id:'DR001', name:'Dr. Rajesh Kumar',    specialty:'General Medicine', phone:'+91 9876543210', email:'r.kumar@medicare.com',    experience:15, qualification:'MBBS, MD', status:'Available' },
    { id:'DR002', name:'Dr. Priya Sharma',    specialty:'Cardiology',       phone:'+91 9876543211', email:'p.sharma@medicare.com',    experience:12, qualification:'MBBS, DM (Cardiology)', status:'Available' },
    { id:'DR003', name:'Dr. Anil Mehta',      specialty:'Orthopedics',      phone:'+91 9876543212', email:'a.mehta@medicare.com',     experience:18, qualification:'MBBS, MS (Ortho)', status:'Busy' },
    { id:'DR004', name:'Dr. Sunita Patel',    specialty:'Pediatrics',       phone:'+91 9876543213', email:'s.patel@medicare.com',     experience:10, qualification:'MBBS, MD (Pediatrics)', status:'Available' },
    { id:'DR005', name:'Dr. Vikram Singh',    specialty:'Neurology',        phone:'+91 9876543214', email:'v.singh@medicare.com',     experience:14, qualification:'MBBS, DM (Neurology)', status:'On Leave' },
    { id:'DR006', name:'Dr. Ananya Bose',     specialty:'Gynecology',       phone:'+91 9876543215', email:'a.bose@medicare.com',      experience:11, qualification:'MBBS, MS (Gynaec)', status:'Available' },
    { id:'DR007', name:'Dr. Ramesh Nair',     specialty:'Dermatology',      phone:'+91 9876543216', email:'r.nair@medicare.com',      experience:9,  qualification:'MBBS, MD (Dermatology)', status:'Available' },
    { id:'DR008', name:'Dr. Kavitha Reddy',   specialty:'ENT',              phone:'+91 9876543217', email:'k.reddy@medicare.com',     experience:13, qualification:'MBBS, MS (ENT)', status:'Available' },
  ];
  doctors = defaults;
  saveDoctors();
}

function seedDemoData() {
  if (patients.length > 0) return;
  const demoPatients = [
    { id:generatePID(), firstName:'Arjun',    lastName:'Verma',    middleName:'', dob:'1985-04-12', age:39, gender:'Male',   phone:'9845612345', email:'arjun@mail.com', blood:'B+', marital:'Married', address:'123 MG Road, Bengaluru', city:'Bengaluru', pincode:'560001', dept:'Cardiology',      doctor:'Dr. Priya Sharma',  patientType:'Outpatient', admDate:today(), chiefComplaint:'Chest pain', allergies:'None', insurance:'LIC Health', height:172, weight:75, bmi:'25.4', emgName:'Neha Verma',  emgRelation:'Spouse',  emgPhone:'9845612346', idType:'Aadhaar Card', idNumber:'1234 5678 9012', regDate: dateAgo(5)  },
    { id:generatePID(), firstName:'Meena',    lastName:'Iyer',     middleName:'', dob:'1992-07-22', age:32, gender:'Female', phone:'9934512678', email:'meena@mail.com',  blood:'O+', marital:'Single',  address:'45 Anna Nagar, Chennai',   city:'Chennai',   pincode:'600040', dept:'Gynecology',      doctor:'Dr. Ananya Bose',   patientType:'Inpatient',  admDate:today(), chiefComplaint:'Irregular cycle', allergies:'Penicillin', insurance:'Self-Pay', height:158, weight:55, bmi:'22.0', emgName:'Ravi Iyer',   emgRelation:'Parent',  emgPhone:'9934512679', idType:'PAN Card',    idNumber:'ABCDE1234F',     regDate: dateAgo(3)  },
    { id:generatePID(), firstName:'Suresh',   lastName:'Pillai',   middleName:'', dob:'1978-11-05', age:46, gender:'Male',   phone:'9812378456', email:'suresh@mail.com', blood:'A+', marital:'Married', address:'78 Park Street, Kochi',    city:'Kochi',     pincode:'682001', dept:'Orthopedics',     doctor:'Dr. Anil Mehta',    patientType:'Outpatient', admDate:today(), chiefComplaint:'Knee pain', allergies:'None', insurance:'Star Health', height:168, weight:82, bmi:'29.1', emgName:'Geetha Pillai',emgRelation:'Spouse',  emgPhone:'9812378457', idType:'Voter ID',    idNumber:'KL/12/345/678',  regDate: dateAgo(10) },
    { id:generatePID(), firstName:'Lakshmi',  lastName:'Devi',     middleName:'', dob:'2012-03-18', age:12, gender:'Female', phone:'9756434501', email:'',                blood:'AB+',marital:'',        address:'22 Civil Lines, Hyderabad',city:'Hyderabad', pincode:'500001', dept:'Pediatrics',      doctor:'Dr. Sunita Patel',  patientType:'Outpatient', admDate:today(), chiefComplaint:'Fever & cough', allergies:'Sulfa drugs', insurance:'Self-Pay', height:148, weight:40, bmi:'18.3', emgName:'Mohan Devi',  emgRelation:'Parent',  emgPhone:'9756434502', idType:'Aadhaar Card', idNumber:'9876 5432 1098', regDate: dateAgo(1)  },
    { id:generatePID(), firstName:'Deepak',   lastName:'Chauhan',  middleName:'', dob:'1965-09-30', age:59, gender:'Male',   phone:'9654323456', email:'deepak@mail.com', blood:'O-', marital:'Married', address:'9 Sector 17, Chandigarh',  city:'Chandigarh',pincode:'160017', dept:'Neurology',       doctor:'Dr. Vikram Singh',  patientType:'Emergency',  admDate:today(), chiefComplaint:'Severe headache & dizziness', allergies:'None', insurance:'ICICI Lombard', height:175, weight:80, bmi:'26.1', emgName:'Kavita Chauhan',emgRelation:'Spouse',emgPhone:'9654323457', idType:'Passport',    idNumber:'P1234567',       regDate: dateAgo(2)  },
  ];
  patients = demoPatients;
  savePatients();

  // Demo appointments
  const pid = (i) => patients[i]?.id || '';
  appointments = [
    { id:'APT001', patientId:pid(0), patientName:'Arjun Verma',   doctor:'Dr. Priya Sharma',  dept:'Cardiology',     date:today(), time:'09:30', type:'Consultation', status:'Scheduled', notes:'Follow-up ECG', createdAt:dateAgo(0) },
    { id:'APT002', patientId:pid(1), patientName:'Meena Iyer',     doctor:'Dr. Ananya Bose',   dept:'Gynecology',     date:today(), time:'10:45', type:'Follow-up',    status:'Completed',  notes:'',  createdAt:dateAgo(1) },
    { id:'APT003', patientId:pid(2), patientName:'Suresh Pillai',  doctor:'Dr. Anil Mehta',    dept:'Orthopedics',    date:today(), time:'11:30', type:'Consultation', status:'Pending',   notes:'X-ray required', createdAt:dateAgo(1) },
    { id:'APT004', patientId:pid(3), patientName:'Lakshmi Devi',   doctor:'Dr. Sunita Patel',  dept:'Pediatrics',     date:dateAgo(-1), time:'14:00', type:'Consultation', status:'Scheduled', notes:'Routine checkup', createdAt:dateAgo(0) },
    { id:'APT005', patientId:pid(4), patientName:'Deepak Chauhan', doctor:'Dr. Vikram Singh',  dept:'Neurology',      date:dateAgo(-1), time:'15:30', type:'Emergency',   status:'Cancelled', notes:'Patient cancelled', createdAt:dateAgo(2) },
  ];
  saveAppointments();

  // Demo bills
  bills = [
    { id:'BILL001', patientId:pid(0), patientName:'Arjun Verma',   date:dateAgo(5), services:[{desc:'Consultation',cat:'OPD',qty:1,rate:500,amount:500},{desc:'ECG',cat:'Diagnostics',qty:1,rate:300,amount:300}], subtotal:800,  discount:0,  tax:5, grandTotal:840,  payMode:'Card',  status:'Paid',    notes:'' },
    { id:'BILL002', patientId:pid(1), patientName:'Meena Iyer',     date:dateAgo(3), services:[{desc:'Consultation',cat:'OPD',qty:1,rate:600,amount:600},{desc:'Ultrasound',cat:'Diagnostics',qty:1,rate:800,amount:800},{desc:'Lab Tests',cat:'Lab',qty:1,rate:400,amount:400}], subtotal:1800, discount:10, tax:5, grandTotal:1701, payMode:'Cash',  status:'Partial', notes:'₹900 paid, remaining pending' },
    { id:'BILL003', patientId:pid(2), patientName:'Suresh Pillai',  date:dateAgo(10),services:[{desc:'Consultation',cat:'OPD',qty:1,rate:500,amount:500},{desc:'X-Ray',cat:'Diagnostics',qty:2,rate:350,amount:700}], subtotal:1200, discount:5,  tax:5, grandTotal:1197, payMode:'Insurance', status:'Paid', notes:'' },
  ];
  saveBills();

  addNotification('info', '5 patients registered today');
  addNotification('success', 'APT003 appointment pending confirmation');
  addNotification('info', 'Dr. Vikram Singh on leave today');
}

function today() { return new Date().toISOString().split('T')[0]; }
function dateAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────
function savePatients()     { localStorage.setItem('mc_patients',     JSON.stringify(patients)); }
function saveAppointments() { localStorage.setItem('mc_appointments', JSON.stringify(appointments)); }
function saveBills()        { localStorage.setItem('mc_bills',        JSON.stringify(bills)); }
function saveDoctors()      { localStorage.setItem('mc_doctors',      JSON.stringify(doctors)); }
function saveNotifs()       { localStorage.setItem('mc_notifs',       JSON.stringify(notifications)); }

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
function generatePID() {
  return 'PAT' + String(Date.now()).slice(-6);
}
function generateBillNo() {
  return 'BILL' + String(Date.now()).slice(-5);
}
function generateApptId() {
  return 'APT' + String(Date.now()).slice(-5);
}
function avatarColor(str) {
  let hash = 0;
  for (let c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}
function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtCurrency(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function sanitize(s) {
  const el = document.createElement('div');
  el.textContent = s;
  return el.innerHTML;
}

// ─────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────
function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  t.className = 'toast ' + type;
  t.innerHTML = `<i class="fa ${icons[type]||'fa-circle-info'}"></i>${msg}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3500);
}

// ─────────────────────────────────────────────────────
// CONFIRM DIALOG
// ─────────────────────────────────────────────────────
function showConfirm(title, msg, btnText='Delete', danger=true) {
  return new Promise(resolve => {
    confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent   = msg;
    document.getElementById('confirmOkBtn').textContent = btnText;
    document.getElementById('confirmOkBtn').className   = danger ? 'btn-danger' : 'btn-primary';
    document.getElementById('confirmOverlay').classList.remove('hidden');
  });
}
function resolveConfirm(val) {
  document.getElementById('confirmOverlay').classList.add('hidden');
  if (confirmResolve) confirmResolve(val);
  confirmResolve = null;
}

// ─────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────
function addNotification(type, msg) {
  notifications.unshift({ type, msg, time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) });
  saveNotifs();
  updateNotifDot();
  renderNotifications();
}
function updateNotifDot() {
  const dot = document.getElementById('notifDot');
  if (notifications.length > 0) dot.style.display = 'block';
  else dot.style.display = 'none';
}
function renderNotifications() {
  const list = document.getElementById('notifList');
  if (notifications.length === 0) {
    list.innerHTML = '<div class="notif-item" style="text-align:center;color:#94a3b8;">No notifications</div>';
    return;
  }
  list.innerHTML = notifications.slice(0,5).map(n => `
    <div class="notif-item">
      <strong>${sanitize(n.msg)}</strong><br/>
      <small style="color:#94a3b8;">${n.time}</small>
    </div>
  `).join('');
}
function toggleNotif() {
  document.getElementById('notifDropdown').classList.toggle('hidden');
  document.getElementById('userDropdown').classList.add('hidden');
}
function clearNotifs() {
  notifications = [];
  saveNotifs();
  updateNotifDot();
  renderNotifications();
}

// ─────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Signing In…';
  btn.disabled = true;

  setTimeout(() => {
    const role  = document.getElementById('loginRole').value;
    const uname = document.getElementById('loginUsername').value.trim();
    const roleLabels = { admin:'Administrator', doctor:'Doctor', receptionist:'Receptionist' };

    document.getElementById('avatarInitial').textContent = uname[0]?.toUpperCase() || 'A';
    document.getElementById('avatarName').textContent    = roleLabels[role] || 'User';
    document.getElementById('udAvatar').textContent      = uname[0]?.toUpperCase() || 'A';
    document.getElementById('udName').textContent        = roleLabels[role];
    document.getElementById('udEmail').textContent       = document.getElementById('loginUsername').value;

    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('websitePage')?.classList.remove('active');
    document.getElementById('mainApp').classList.add('active');

    btn.innerHTML = '<span>Sign In</span><i class="fa fa-arrow-right"></i>';
    btn.disabled = false;

    showSection('dashboard', document.getElementById('nav-dashboard'));
    showToast('Welcome back! Logged in as ' + roleLabels[role], 'success');
  }, 1000);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function navigateToWebsite() {
  showPage('websitePage');
}

function navigateToLogin() {
  showPage('loginPage');
}

function navigateToRegister() {
  showPage('mainApp');
  showSection('registration', document.getElementById('nav-registration'));
}

function navigateToAppt() {
  showPage('mainApp');
  showSection('appointments', document.getElementById('nav-appointments'));
}

function handleLogout() {
  showPage('websitePage');
  document.getElementById('loginForm')?.reset();
  document.getElementById('userDropdown')?.classList.add('hidden');
  showToast('You have returned to the hospital website.', 'info');
}


function togglePassword() {
  const inp  = document.getElementById('loginPassword');
  const icon = document.getElementById('eyeIcon');
  if (inp.type === 'password') { inp.type = 'text';     icon.className = 'fa fa-eye-slash'; }
  else                         { inp.type = 'password'; icon.className = 'fa fa-eye'; }
}
function toggleUserMenu() {
  document.getElementById('userDropdown').classList.toggle('hidden');
  document.getElementById('notifDropdown').classList.add('hidden');
}

// ─────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────
function showSection(name, navEl) {
  // Deactivate all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('sec' + capitalize(name));
  if (el) el.classList.add('active');
  if (navEl) navEl.classList.add('active');

  // Refresh content
  if (name === 'dashboard')   renderDashboard();
  if (name === 'patients')    renderPatients();
  if (name === 'appointments')renderAppointments();
  if (name === 'billing')     renderBilling();
  if (name === 'reports')     renderReports();
  if (name === 'doctors')     renderDoctors();

  // Mobile: close sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (window.innerWidth <= 860) {
    sb.classList.toggle('mobile-open');
  } else {
    sb.classList.toggle('collapsed');
  }
}

// ─────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────
function renderDashboard() {
  document.getElementById('kpiPatients').textContent = patients.length;
  document.getElementById('kpiAppts').textContent    = appointments.filter(a => a.date === today()).length;

  const todayRevenue = bills
    .filter(b => b.date === today() && b.status === 'Paid')
    .reduce((s, b) => s + Number(b.grandTotal), 0);
  document.getElementById('kpiRevenue').textContent  = fmtCurrency(todayRevenue);

  // Recent patients
  const list = document.getElementById('recentPatientsList');
  const recent = [...patients].reverse().slice(0,5);
  if (recent.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No patients yet</p>';
  } else {
    list.innerHTML = recent.map(p => {
      const name = `${p.firstName} ${p.lastName}`;
      const col  = avatarColor(name);
      const typeClass = p.patientType === 'Emergency' ? 'status-cancelled' :
                        p.patientType === 'Inpatient'  ? 'status-scheduled' : 'status-completed';
      return `
        <div class="recent-patient-item">
          <div class="rp-avatar" style="background:${col}">${initials(name)}</div>
          <div class="rp-info">
            <div class="rp-name">${sanitize(name)}</div>
            <div class="rp-dept">${sanitize(p.dept)} · ${sanitize(p.phone)}</div>
          </div>
          <span class="rp-tag status-badge ${typeClass}">${sanitize(p.patientType)}</span>
        </div>
      `;
    }).join('');
  }

  // Upcoming appointments table
  const tbody = document.getElementById('dashApptBody');
  const upcoming = appointments.filter(a => a.date >= today()).slice(0,5);
  if (upcoming.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px;">No upcoming appointments</td></tr>';
  } else {
    tbody.innerHTML = upcoming.map(a => `
      <tr>
        <td><strong>${sanitize(a.patientName)}</strong></td>
        <td>${sanitize(a.doctor)}</td>
        <td>${fmtDate(a.date)}</td>
        <td>${a.time}</td>
        <td><span class="status-badge ${statusClass(a.status)}">${sanitize(a.status)}</span></td>
      </tr>
    `).join('');
  }

  updateBadge();
}

function statusClass(s) {
  const map = { Scheduled:'status-scheduled', Completed:'status-completed', Cancelled:'status-cancelled', Pending:'status-pending', Paid:'status-paid', Partial:'status-partial', Available:'status-available', 'On Leave':'status-on-leave', Busy:'status-busy' };
  return map[s] || '';
}

function updateBadge() {
  const count = appointments.filter(a => a.status === 'Scheduled' || a.status === 'Pending').length;
  document.getElementById('apptBadge').textContent = count;
}

// ─────────────────────────────────────────────────────
// PATIENT REGISTRATION
// ─────────────────────────────────────────────────────
let currentStep = 1;

function nextStep(step) {
  // Validate current step before moving forward
  if (step > currentStep) {
    const stepEl = document.getElementById('regStep' + currentStep);
    const isValid = validateStep(stepEl);
    if (!isValid) {
      // Scroll to first error field
      const firstErr = stepEl.querySelector('.field-error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Please fix the errors before continuing.', 'error');
      return;
    }
  }

  // Mark done/active
  for (let i = 1; i <= 3; i++) {
    const ind = document.getElementById('step' + i + 'Indicator');
    if (i < step)        ind.className = 'step done';
    else if (i === step) ind.className = 'step active';
    else                 ind.className = 'step';
  }

  // Show/hide step content
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('regStep' + i);
    if (i === step) el.classList.remove('hidden');
    else            el.classList.add('hidden');
  }

  currentStep = step;
}

function calculateAge() {
  const dob = document.getElementById('regDOB').value;
  if (!dob) return;
  const age = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
  document.getElementById('regAge').value = age >= 0 ? age : '';
}

function calcBMI() {
  const h = parseFloat(document.getElementById('regHeight').value);
  const w = parseFloat(document.getElementById('regWeight').value);
  if (h > 0 && w > 0) {
    const bmi = (w / ((h/100) ** 2)).toFixed(1);
    document.getElementById('regBMI').value = bmi;
  }
}

function filterDoctorsByDept() {
  const dept   = document.getElementById('regDept').value;
  const select = document.getElementById('regDoctor');
  populateDoctorSelect(select, dept);
}

function filterDoctorsAppt() {
  const dept   = document.getElementById('apptDeptM').value;
  const select = document.getElementById('apptDoctorM');
  populateDoctorSelect(select, dept);
}

function populateDoctorSelect(select, dept) {
  const filtered = dept ? doctors.filter(d => d.specialty === dept) : doctors;
  select.innerHTML = '<option value="">Select Doctor</option>' +
    filtered.map(d => `<option value="${sanitize(d.name)}">${sanitize(d.name)}</option>`).join('');
}

function previewPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.getElementById('photoPreview');
    img.src = ev.target.result;
    img.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function handleRegistration(e) {
  e.preventDefault();
  const p = {
    id:           generatePID(),
    firstName:    document.getElementById('regFirstName').value.trim(),
    middleName:   document.getElementById('regMiddleName').value.trim(),
    lastName:     document.getElementById('regLastName').value.trim(),
    dob:          document.getElementById('regDOB').value,
    age:          document.getElementById('regAge').value,
    gender:       document.getElementById('regGender').value,
    phone:        document.getElementById('regPhone').value.trim(),
    email:        document.getElementById('regEmail').value.trim(),
    blood:        document.getElementById('regBloodGroup').value,
    marital:      document.getElementById('regMarital').value,
    address:      document.getElementById('regAddress').value.trim(),
    city:         document.getElementById('regCity').value.trim(),
    pincode:      document.getElementById('regPincode').value.trim(),
    dept:         document.getElementById('regDept').value,
    doctor:       document.getElementById('regDoctor').value,
    patientType:  document.getElementById('regPatientType').value,
    admDate:      document.getElementById('regAdmDate').value,
    wardRoom:     document.getElementById('regWardRoom').value.trim(),
    chiefComplaint:document.getElementById('regChiefComplaint').value.trim(),
    medHistory:   document.getElementById('regMedHistory').value.trim(),
    allergies:    document.getElementById('regAllergies').value.trim(),
    insurance:    document.getElementById('regInsurance').value.trim(),
    height:       document.getElementById('regHeight').value,
    weight:       document.getElementById('regWeight').value,
    bmi:          document.getElementById('regBMI').value,
    emgName:      document.getElementById('regEmgName').value.trim(),
    emgRelation:  document.getElementById('regEmgRelation').value,
    emgPhone:     document.getElementById('regEmgPhone').value.trim(),
    emgEmail:     document.getElementById('regEmgEmail').value.trim(),
    emgAddress:   document.getElementById('regEmgAddress').value.trim(),
    idType:       document.getElementById('regIdType').value,
    idNumber:     document.getElementById('regIdNumber').value.trim(),
    regDate:      today(),
  };

  patients.push(p);
  savePatients();
  addNotification('success', `Patient ${p.firstName} ${p.lastName} registered (${p.id})`);
  showToast(`Patient ${p.firstName} ${p.lastName} registered successfully!`, 'success');
  resetRegistrationForm();
  showSection('patients', document.getElementById('nav-patients'));
}

function resetRegistrationForm() {
  document.getElementById('registrationForm').reset();
  document.getElementById('regAge').value  = '';
  document.getElementById('regBMI').value  = '';
  document.getElementById('photoPreview').classList.add('hidden');
  document.getElementById('regDoctor').innerHTML = '<option value="">Select Doctor</option>';
  nextStep(1);
  currentStep = 1;
}

// ─────────────────────────────────────────────────────
// PATIENT LIST
// ─────────────────────────────────────────────────────
function renderPatients(list = patients) {
  const tbody   = document.getElementById('patientListBody');
  const empty   = document.getElementById('patientEmpty');
  const visible = applyPatientFilters(list);

  empty.classList.toggle('hidden', visible.length > 0);
  if (visible.length === 0) { tbody.innerHTML = ''; return; }

  tbody.innerHTML = visible.map(p => {
    const name = `${p.firstName} ${p.middleName ? p.middleName + ' ' : ''}${p.lastName}`;
    const col  = avatarColor(name);
    const typeClass = p.patientType === 'Emergency' ? 'status-cancelled' :
                      p.patientType === 'Inpatient'  ? 'status-scheduled' : 'status-completed';
    return `
      <tr>
        <td><span style="font-family:monospace;font-size:.78rem;background:var(--bg);padding:2px 7px;border-radius:4px;">${sanitize(p.id)}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;min-width:34px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;color:white;font-size:.78rem;font-weight:700;">${initials(name)}</div>
            <div>
              <div style="font-weight:600;">${sanitize(name)}</div>
              <div style="font-size:.74rem;color:#94a3b8;">${sanitize(p.email||'—')}</div>
            </div>
          </div>
        </td>
        <td>${sanitize(p.age||'—')} / ${sanitize(p.gender)}</td>
        <td><span class="rp-tag status-badge" style="background:#fee2e2;color:#dc2626;">${sanitize(p.blood)}</span></td>
        <td>${sanitize(p.dept||'—')}</td>
        <td>${sanitize(p.doctor||'—')}</td>
        <td>${sanitize(p.phone)}</td>
        <td><span class="status-badge ${typeClass}">${sanitize(p.patientType)}</span></td>
        <td style="font-size:.8rem;">${fmtDate(p.regDate)}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn-icon view" onclick="viewPatient('${p.id}')" title="View"><i class="fa fa-eye"></i></button>
            <button class="btn-icon edit" onclick="editPatient('${p.id}')" title="Edit"><i class="fa fa-pen"></i></button>
            <button class="btn-icon print" onclick="billForPatient('${p.id}')" title="Bill"><i class="fa fa-file-invoice-dollar"></i></button>
            <button class="btn-icon del"  onclick="deletePatient('${p.id}')" title="Delete"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function applyPatientFilters(list = patients) {
  const q     = (document.getElementById('patientSearch')?.value||'').toLowerCase();
  const gender= document.getElementById('patientGenderFilter')?.value||'';
  const dept  = document.getElementById('patientDeptFilter')?.value||'';
  return list.filter(p => {
    const name  = `${p.firstName} ${p.lastName}`.toLowerCase();
    const match = !q || name.includes(q) || p.id.toLowerCase().includes(q) || p.phone.includes(q);
    const gm    = !gender || p.gender === gender;
    const dm    = !dept   || p.dept   === dept;
    return match && gm && dm;
  });
}

function filterPatients() { renderPatients(); }

async function deletePatient(id) {
  const ok = await showConfirm('Delete Patient?', 'This will permanently remove the patient record.', 'Delete', true);
  if (!ok) return;
  patients = patients.filter(p => p.id !== id);
  savePatients();
  renderPatients();
  showToast('Patient deleted.', 'info');
}

function viewPatient(id) {
  const p = patients.find(x => x.id === id);
  if (!p) return;
  const name = `${p.firstName} ${p.middleName ? p.middleName + ' ' : ''}${p.lastName}`;
  const col  = avatarColor(name);

  document.getElementById('patientModalContent').innerHTML = `
    <div class="patient-header">
      <div class="patient-header-avatar" style="background:rgba(255,255,255,.2)">${initials(name)}</div>
      <div>
        <h3>${sanitize(name)}</h3>
        <p>${sanitize(p.id)} · ${sanitize(p.dept||'—')} · ${sanitize(p.patientType)}</p>
      </div>
    </div>
    <div class="patient-detail-grid">
      <div class="patient-detail-section">
        <h4><i class="fa fa-user"></i> Personal Information</h4>
        <div class="pd-item"><span class="pd-key">Date of Birth</span><span class="pd-val">${fmtDate(p.dob)}</span></div>
        <div class="pd-item"><span class="pd-key">Age / Gender</span><span class="pd-val">${sanitize(p.age||'—')} yrs / ${sanitize(p.gender)}</span></div>
        <div class="pd-item"><span class="pd-key">Blood Group</span><span class="pd-val">${sanitize(p.blood)}</span></div>
        <div class="pd-item"><span class="pd-key">Marital Status</span><span class="pd-val">${sanitize(p.marital||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Phone</span><span class="pd-val">${sanitize(p.phone)}</span></div>
        <div class="pd-item"><span class="pd-key">Email</span><span class="pd-val">${sanitize(p.email||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Address</span><span class="pd-val">${sanitize(p.address)}, ${sanitize(p.city)} ${sanitize(p.pincode||'')}</span></div>
      </div>
      <div class="patient-detail-section">
        <h4><i class="fa fa-stethoscope"></i> Medical Information</h4>
        <div class="pd-item"><span class="pd-key">Department</span><span class="pd-val">${sanitize(p.dept||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Doctor</span><span class="pd-val">${sanitize(p.doctor||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Patient Type</span><span class="pd-val">${sanitize(p.patientType)}</span></div>
        <div class="pd-item"><span class="pd-key">Ward / Room</span><span class="pd-val">${sanitize(p.wardRoom||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Chief Complaint</span><span class="pd-val">${sanitize(p.chiefComplaint||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Allergies</span><span class="pd-val">${sanitize(p.allergies||'None')}</span></div>
        <div class="pd-item"><span class="pd-key">Height / Weight</span><span class="pd-val">${p.height||'—'} cm / ${p.weight||'—'} kg</span></div>
        <div class="pd-item"><span class="pd-key">BMI</span><span class="pd-val">${sanitize(p.bmi||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Insurance</span><span class="pd-val">${sanitize(p.insurance||'—')}</span></div>
      </div>
      <div class="patient-detail-section">
        <h4><i class="fa fa-phone-volume"></i> Emergency Contact</h4>
        <div class="pd-item"><span class="pd-key">Name</span><span class="pd-val">${sanitize(p.emgName||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Relationship</span><span class="pd-val">${sanitize(p.emgRelation||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Phone</span><span class="pd-val">${sanitize(p.emgPhone||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Email</span><span class="pd-val">${sanitize(p.emgEmail||'—')}</span></div>
      </div>
      <div class="patient-detail-section">
        <h4><i class="fa fa-id-card"></i> Identity & Registration</h4>
        <div class="pd-item"><span class="pd-key">ID Type</span><span class="pd-val">${sanitize(p.idType||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">ID Number</span><span class="pd-val">${sanitize(p.idNumber||'—')}</span></div>
        <div class="pd-item"><span class="pd-key">Registered</span><span class="pd-val">${fmtDate(p.regDate)}</span></div>
        <div class="pd-item"><span class="pd-key">Adm. Date</span><span class="pd-val">${fmtDate(p.admDate)}</span></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-outline" onclick="closePatientModal()">Close</button>
      <button class="btn-primary" onclick="closePatientModal();billForPatient('${p.id}')"><i class="fa fa-file-invoice-dollar"></i> Generate Bill</button>
    </div>
  `;

  document.getElementById('patientModal').classList.remove('hidden');
}

function closePatientModal() {
  document.getElementById('patientModal').classList.add('hidden');
}

function editPatient(id) {
  // Pre-fill the registration form and switch to it
  const p = patients.find(x => x.id === id);
  if (!p) return;
  showSection('registration', document.getElementById('nav-registration'));
  setTimeout(() => {
    document.getElementById('regFirstName').value    = p.firstName;
    document.getElementById('regMiddleName').value   = p.middleName;
    document.getElementById('regLastName').value     = p.lastName;
    document.getElementById('regDOB').value          = p.dob;
    document.getElementById('regAge').value          = p.age;
    document.getElementById('regGender').value       = p.gender;
    document.getElementById('regPhone').value        = p.phone;
    document.getElementById('regEmail').value        = p.email;
    document.getElementById('regBloodGroup').value   = p.blood;
    document.getElementById('regMarital').value      = p.marital;
    document.getElementById('regAddress').value      = p.address;
    document.getElementById('regCity').value         = p.city;
    document.getElementById('regPincode').value      = p.pincode;
    document.getElementById('regDept').value         = p.dept;
    filterDoctorsByDept();
    setTimeout(() => {
      document.getElementById('regDoctor').value     = p.doctor;
    }, 100);
    document.getElementById('regPatientType').value  = p.patientType;
    document.getElementById('regAdmDate').value      = p.admDate;
    document.getElementById('regWardRoom').value     = p.wardRoom;
    document.getElementById('regChiefComplaint').value= p.chiefComplaint;
    document.getElementById('regMedHistory').value   = p.medHistory;
    document.getElementById('regAllergies').value    = p.allergies;
    document.getElementById('regInsurance').value    = p.insurance;
    document.getElementById('regHeight').value       = p.height;
    document.getElementById('regWeight').value       = p.weight;
    document.getElementById('regBMI').value          = p.bmi;
    document.getElementById('regEmgName').value      = p.emgName;
    document.getElementById('regEmgRelation').value  = p.emgRelation;
    document.getElementById('regEmgPhone').value     = p.emgPhone;
    document.getElementById('regEmgEmail').value     = p.emgEmail;
    document.getElementById('regEmgAddress').value   = p.emgAddress;
    document.getElementById('regIdType').value       = p.idType;
    document.getElementById('regIdNumber').value     = p.idNumber;

    // Override submit to update
    const form = document.getElementById('registrationForm');
    form._editId = id;
  }, 100);
  showToast('Editing patient – update the form and click Register to save.', 'info');
}

function exportPatients() {
  if (patients.length === 0) { showToast('No patients to export', 'error'); return; }
  const headers = ['ID','First Name','Last Name','DOB','Age','Gender','Blood','Phone','Email','Department','Doctor','Type','City','Registered'];
  const rows = patients.map(p => [p.id, p.firstName, p.lastName, p.dob, p.age, p.gender, p.blood, p.phone, p.email, p.dept, p.doctor, p.patientType, p.city, p.regDate]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = 'patients.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Patients exported to CSV', 'success');
}

// ─────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────
function openApptModal(id = null) {
  editApptId = id;
  populatePatientSelect('apptPatient');
  populateDoctorSelect(document.getElementById('apptDoctorM'), '');

  if (id) {
    const a = appointments.find(x => x.id === id);
    if (!a) return;
    document.getElementById('apptModalTitle').innerHTML = '<i class="fa fa-pen"></i> Edit Appointment';
    document.getElementById('apptPatient').value  = a.patientId;
    document.getElementById('apptDeptM').value    = a.dept;
    filterDoctorsAppt();
    setTimeout(() => { document.getElementById('apptDoctorM').value = a.doctor; }, 100);
    document.getElementById('apptTypeM').value    = a.type;
    document.getElementById('apptDate').value     = a.date;
    document.getElementById('apptTime').value     = a.time;
    document.getElementById('apptNotes').value    = a.notes;
    document.getElementById('apptStatus').value   = a.status;
  } else {
    document.getElementById('apptModalTitle').innerHTML = '<i class="fa fa-calendar-plus"></i> New Appointment';
    document.getElementById('apptForm').reset();
    document.getElementById('apptDate').value = today();
    document.getElementById('apptStatus').value = 'Scheduled';
  }
  document.getElementById('apptModal').classList.remove('hidden');
}

function closeApptModal() {
  document.getElementById('apptModal').classList.add('hidden');
  editApptId = null;
}

function saveAppointment(e) {
  e.preventDefault();
  const patientId = document.getElementById('apptPatient').value;
  const patient   = patients.find(p => p.id === patientId);
  const appt = {
    id:          editApptId || generateApptId(),
    patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
    doctor:      document.getElementById('apptDoctorM').value,
    dept:        document.getElementById('apptDeptM').value,
    date:        document.getElementById('apptDate').value,
    time:        document.getElementById('apptTime').value,
    type:        document.getElementById('apptTypeM').value,
    status:      document.getElementById('apptStatus').value,
    notes:       document.getElementById('apptNotes').value.trim(),
    createdAt:   editApptId ? appointments.find(a=>a.id===editApptId)?.createdAt : today(),
  };

  if (editApptId) {
    const idx = appointments.findIndex(a => a.id === editApptId);
    appointments[idx] = appt;
    showToast('Appointment updated!', 'success');
  } else {
    appointments.push(appt);
    addNotification('info', `Appointment for ${appt.patientName} on ${fmtDate(appt.date)}`);
    showToast('Appointment scheduled!', 'success');
  }

  saveAppointments();
  updateBadge();
  closeApptModal();
  renderAppointments();
}

function renderAppointments(list = appointments) {
  const tbody = document.getElementById('appointmentsBody');
  const empty = document.getElementById('apptEmpty');
  const visible = applyApptFilters(list);

  empty.classList.toggle('hidden', visible.length > 0);
  if (visible.length === 0) { tbody.innerHTML = ''; return; }

  tbody.innerHTML = visible.map(a => `
    <tr>
      <td><span style="font-family:monospace;font-size:.78rem;">${sanitize(a.id)}</span></td>
      <td><strong>${sanitize(a.patientName)}</strong></td>
      <td>${sanitize(a.doctor)}</td>
      <td>${sanitize(a.dept)}</td>
      <td>${fmtDate(a.date)}</td>
      <td>${a.time}</td>
      <td><span style="font-size:.8rem;color:var(--text-secondary);">${sanitize(a.type)}</span></td>
      <td><span class="status-badge ${statusClass(a.status)}">${sanitize(a.status)}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn-icon edit"  onclick="openApptModal('${a.id}')" title="Edit"><i class="fa fa-pen"></i></button>
          <button class="btn-icon del"   onclick="deleteAppt('${a.id}')"   title="Delete"><i class="fa fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function applyApptFilters(list = appointments) {
  const q      = (document.getElementById('apptSearch')?.value||'').toLowerCase();
  const status = document.getElementById('apptStatusFilter')?.value||'';
  const dept   = document.getElementById('apptDeptFilter')?.value||'';
  const date   = document.getElementById('apptDateFilter')?.value||'';
  return list.filter(a => {
    const match  = !q || a.patientName.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    const sm     = !status || a.status === status;
    const dm     = !dept   || a.dept   === dept;
    const dtm    = !date   || a.date   === date;
    return match && sm && dm && dtm;
  });
}

function filterAppointments() { renderAppointments(); }

async function deleteAppt(id) {
  const ok = await showConfirm('Delete Appointment?', 'This will remove the appointment permanently.', 'Delete', true);
  if (!ok) return;
  appointments = appointments.filter(a => a.id !== id);
  saveAppointments();
  updateBadge();
  renderAppointments();
  showToast('Appointment deleted.', 'info');
}

// ─────────────────────────────────────────────────────
// BILLING
// ─────────────────────────────────────────────────────
function openBillModal() {
  populatePatientSelect('billPatient');
  document.getElementById('billForm').reset();
  document.getElementById('billDate').value = today();
  document.getElementById('billPatientInfo').classList.add('hidden');
  document.getElementById('billServicesBody').innerHTML = '';
  document.getElementById('billDiscount').value = '0';
  document.getElementById('billTax').value = '5';
  addBillRow();
  addBillRow();
  calcBillTotal();
  document.getElementById('billModal').classList.remove('hidden');
}

function closeBillModal() {
  document.getElementById('billModal').classList.add('hidden');
}

function fillPatientBillInfo() {
  const id = document.getElementById('billPatient').value;
  const p  = patients.find(x => x.id === id);
  const strip = document.getElementById('billPatientInfo');
  if (!p) { strip.classList.add('hidden'); return; }
  strip.innerHTML = `
    <div><i class="fa fa-user"></i> <span>${sanitize(p.firstName)} ${sanitize(p.lastName)}</span></div>
    <div><i class="fa fa-phone"></i> <span>${sanitize(p.phone)}</span></div>
    <div><i class="fa fa-droplet"></i> <span>${sanitize(p.blood)}</span></div>
    <div><i class="fa fa-stethoscope"></i> <span>${sanitize(p.dept||'—')} / ${sanitize(p.doctor||'—')}</span></div>
    <div><i class="fa fa-shield"></i> <span>${sanitize(p.insurance||'Self-Pay')}</span></div>
  `;
  strip.classList.remove('hidden');
}

let billRowCount = 0;
const SERVICE_PRESETS = [
  'Consultation Fee', 'Follow-up Consultation', 'Emergency Charges',
  'Admission Charges', 'Room Charges (per day)', 'ICU Charges (per day)',
  'Operation Theatre', 'Anaesthesia', 'Blood Test', 'Urine Test',
  'X-Ray', 'ECG', 'Ultrasound', 'MRI Scan', 'CT Scan', 'Endoscopy',
  'Medicines', 'IV Fluids', 'Oxygen Charges', 'Nursing Charges',
  'Physiotherapy', 'Ambulance Charges',
];
const CATEGORIES = ['OPD','IPD','Diagnostics','Lab','Surgery','Pharmacy','ICU','Other'];

function addBillRow() {
  const id = ++billRowCount;
  const tbody = document.getElementById('billServicesBody');
  const tr = document.createElement('tr');
  tr.id = 'billRow' + id;
  tr.innerHTML = `
    <td>
      <input list="servicesList" id="bDesc${id}" placeholder="Service description" oninput="calcBillTotal()" />
      <datalist id="servicesList">${SERVICE_PRESETS.map(s=>`<option value="${s}">`).join('')}</datalist>
    </td>
    <td>
      <select id="bCat${id}" style="width:100%;padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:.82rem;">
        ${CATEGORIES.map(c=>`<option>${c}</option>`).join('')}
      </select>
    </td>
    <td><input type="number" id="bQty${id}" value="1" min="1" max="999" style="width:60px" oninput="calcBillTotal()" /></td>
    <td><input type="number" id="bRate${id}" value="" min="0" placeholder="0.00" oninput="calcBillTotal()" /></td>
    <td class="amount-cell"><span id="bAmt${id}">₹0.00</span></td>
    <td><button type="button" class="btn-icon del" onclick="removeBillRow(${id})" title="Remove"><i class="fa fa-xmark"></i></button></td>
  `;
  tbody.appendChild(tr);
}

function removeBillRow(id) {
  const el = document.getElementById('billRow' + id);
  if (el) el.remove();
  calcBillTotal();
}

function calcBillTotal() {
  let subtotal = 0;
  document.querySelectorAll('[id^="billRow"]').forEach(row => {
    const rowId = row.id.replace('billRow','');
    const qty  = parseFloat(document.getElementById('bQty'  + rowId)?.value)||0;
    const rate = parseFloat(document.getElementById('bRate' + rowId)?.value)||0;
    const amt  = qty * rate;
    subtotal  += amt;
    const amtEl = document.getElementById('bAmt' + rowId);
    if (amtEl) amtEl.textContent = fmtCurrency(amt);
  });
  const disc  = parseFloat(document.getElementById('billDiscount').value)||0;
  const tax   = parseFloat(document.getElementById('billTax').value)||0;
  const after = subtotal * (1 - disc/100);
  const grand = after * (1 + tax/100);
  document.getElementById('billSubtotal').textContent  = fmtCurrency(subtotal);
  document.getElementById('billGrandTotal').textContent= fmtCurrency(grand);
}

function saveBill(e) {
  e.preventDefault();
  const patientId = document.getElementById('billPatient').value;
  const patient   = patients.find(p => p.id === patientId);
  const services  = [];
  document.querySelectorAll('[id^="billRow"]').forEach(row => {
    const rowId = row.id.replace('billRow','');
    const desc = document.getElementById('bDesc'+rowId)?.value.trim();
    const cat  = document.getElementById('bCat' +rowId)?.value;
    const qty  = parseFloat(document.getElementById('bQty' +rowId)?.value)||0;
    const rate = parseFloat(document.getElementById('bRate'+rowId)?.value)||0;
    if (desc) services.push({ desc, cat, qty, rate, amount: qty * rate });
  });
  if (services.length === 0) { showToast('Add at least one service', 'error'); return; }

  const subtotalVal = services.reduce((s,x) => s + x.amount, 0);
  const disc  = parseFloat(document.getElementById('billDiscount').value)||0;
  const tax   = parseFloat(document.getElementById('billTax').value)||0;
  const grand = subtotalVal * (1 - disc/100) * (1 + tax/100);

  const bill = {
    id:          generateBillNo(),
    patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
    date:        document.getElementById('billDate').value,
    services,
    subtotal:    subtotalVal,
    discount:    disc,
    tax,
    grandTotal:  grand,
    payMode:     document.getElementById('billPayMode').value,
    status:      document.getElementById('billPayStatus').value,
    notes:       document.getElementById('billNotes').value.trim(),
  };

  bills.push(bill);
  saveBills();
  addNotification('success', `Bill ${bill.id} generated – ${fmtCurrency(grand)}`);
  showToast(`Bill ${bill.id} generated for ${bill.patientName}`, 'success');
  closeBillModal();
  renderBilling();
}

function renderBilling(list = bills) {
  const tbody   = document.getElementById('billingBody');
  const empty   = document.getElementById('billEmpty');
  const visible = applyBillFilters(list);

  // KPIs
  const total   = bills.reduce((s,b) => s + Number(b.grandTotal),0);
  const paid    = bills.filter(b=>b.status==='Paid').reduce((s,b)=>s+Number(b.grandTotal),0);
  const pending = total - paid;
  document.getElementById('kpiBillCount').textContent   = bills.length;
  document.getElementById('kpiBillPaid').textContent    = fmtCurrency(paid);
  document.getElementById('kpiBillPending').textContent = fmtCurrency(pending);

  empty.classList.toggle('hidden', visible.length > 0);
  if (visible.length === 0) { tbody.innerHTML = ''; return; }

  tbody.innerHTML = visible.map(b => `
    <tr>
      <td><span style="font-family:monospace;font-size:.78rem;">${sanitize(b.id)}</span></td>
      <td><strong>${sanitize(b.patientName)}</strong></td>
      <td>${fmtDate(b.date)}</td>
      <td style="font-size:.78rem;color:var(--text-secondary);">${b.services.map(s=>sanitize(s.desc)).slice(0,2).join(', ')}${b.services.length>2?'…':''}</td>
      <td>${fmtCurrency(b.subtotal)}</td>
      <td>${b.discount}%</td>
      <td>${b.tax}%</td>
      <td><strong>${fmtCurrency(b.grandTotal)}</strong></td>
      <td><span class="status-badge ${statusClass(b.status)}">${sanitize(b.status)}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn-icon view"  onclick="viewInvoice('${b.id}')" title="View Invoice"><i class="fa fa-receipt"></i></button>
          <button class="btn-icon print" onclick="viewInvoice('${b.id}',true)" title="Print"><i class="fa fa-print"></i></button>
          <button class="btn-icon del"   onclick="deleteBill('${b.id}')" title="Delete"><i class="fa fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function applyBillFilters(list = bills) {
  const q      = (document.getElementById('billSearch')?.value||'').toLowerCase();
  const status = document.getElementById('billStatusFilter')?.value||'';
  return list.filter(b => {
    const match = !q || b.patientName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
    const sm    = !status || b.status === status;
    return match && sm;
  });
}
function filterBills() { renderBilling(); }

async function deleteBill(id) {
  const ok = await showConfirm('Delete Bill?', 'This will permanently remove this bill.', 'Delete', true);
  if (!ok) return;
  bills = bills.filter(b => b.id !== id);
  saveBills();
  renderBilling();
  showToast('Bill deleted.', 'info');
}

function viewInvoice(id, autoPrint=false) {
  const b = bills.find(x => x.id === id);
  if (!b) return;
  const p = patients.find(x => x.id === b.patientId);

  const statusBarClass = b.status === 'Paid' ? '' : 'pending';
  const content = `
    <div class="invoice-wrapper" id="printableInvoice">
      <div class="invoice-status-bar ${statusBarClass}">
        ${b.status === 'Paid' ? '<i class="fa fa-circle-check"></i> PAID' : b.status === 'Partial' ? '<i class="fa fa-circle-half-stroke"></i> PARTIALLY PAID' : '<i class="fa fa-clock"></i> PAYMENT PENDING'}
      </div>
      <div class="invoice-header">
        <div class="invoice-logo">
          <div class="invoice-logo-icon"><i class="fa fa-cross"></i></div>
          <div>
            <h2>MediCare Hospital</h2>
            <small>123 Health Avenue, Medical City · +91 044-2345-6789</small><br/>
            <small>info@medicare.com · www.medicare.com</small>
          </div>
        </div>
        <div class="invoice-badge">
          <div class="inv-no">Invoice #${sanitize(b.id)}</div>
          <div class="inv-date">Date: ${fmtDate(b.date)}</div>
          <div class="inv-date">Mode: ${sanitize(b.payMode)}</div>
        </div>
      </div>
      <div class="invoice-patient-info">
        <div>
          <div class="inv-section-title">Bill To</div>
          <div class="inv-info-item"><strong>${sanitize(b.patientName)}</strong></div>
          ${p ? `
            <div class="inv-info-item">ID: ${sanitize(p.id)}</div>
            <div class="inv-info-item">Phone: ${sanitize(p.phone)}</div>
            <div class="inv-info-item">Blood: ${sanitize(p.blood)}</div>
            <div class="inv-info-item">${sanitize(p.address||'')}, ${sanitize(p.city||'')}</div>
          ` : ''}
        </div>
        <div>
          <div class="inv-section-title">Medical Details</div>
          ${p ? `
            <div class="inv-info-item">Department: <strong>${sanitize(p.dept||'—')}</strong></div>
            <div class="inv-info-item">Doctor: <strong>${sanitize(p.doctor||'—')}</strong></div>
            <div class="inv-info-item">Type: <strong>${sanitize(p.patientType)}</strong></div>
            <div class="inv-info-item">Insurance: <strong>${sanitize(p.insurance||'Self-Pay')}</strong></div>
          ` : ''}
        </div>
      </div>
      <table class="invoice-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Category</th>
            <th>Qty</th>
            <th>Rate (₹)</th>
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${b.services.map((s,i) => `
            <tr>
              <td>${i+1}</td>
              <td>${sanitize(s.desc)}</td>
              <td>${sanitize(s.cat||'—')}</td>
              <td>${s.qty}</td>
              <td>${fmtCurrency(s.rate)}</td>
              <td><strong>${fmtCurrency(s.amount)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="invoice-totals-wrap">
        <div class="invoice-totals">
          <div class="inv-total-row"><span>Subtotal</span><span>${fmtCurrency(b.subtotal)}</span></div>
          <div class="inv-total-row"><span>Discount (${b.discount}%)</span><span>-${fmtCurrency(b.subtotal * b.discount / 100)}</span></div>
          <div class="inv-total-row"><span>Tax/GST (${b.tax}%)</span><span>+${fmtCurrency(b.subtotal * (1-b.discount/100) * b.tax / 100)}</span></div>
          <div class="inv-total-row grand"><span>Grand Total</span><span>${fmtCurrency(b.grandTotal)}</span></div>
        </div>
      </div>
      ${b.notes ? `<div style="padding:12px 16px;background:#f8faff;border-radius:8px;font-size:.82rem;color:#475569;margin-bottom:16px;"><strong>Notes:</strong> ${sanitize(b.notes)}</div>` : ''}
      <div class="invoice-footer">
        <p>Thank you for choosing MediCare Hospital · This is a computer-generated invoice</p>
        <p>For queries: billing@medicare.com | +91 044-2345-6789</p>
      </div>
    </div>
  `;

  document.getElementById('invoiceContent').innerHTML = content;
  document.getElementById('invoiceModal').classList.remove('hidden');
  if (autoPrint) setTimeout(printInvoice, 400);
}

function closeInvoiceModal() { document.getElementById('invoiceModal').classList.add('hidden'); }

function printInvoice() {
  window.print();
}

function billForPatient(patientId) {
  showSection('billing', document.getElementById('nav-billing'));
  setTimeout(() => {
    openBillModal();
    document.getElementById('billPatient').value = patientId;
    fillPatientBillInfo();
  }, 150);
}

// ─────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────
function renderReports() {
  document.getElementById('rptPatients').textContent = patients.length;
  document.getElementById('rptAppts').textContent    = appointments.length;
  document.getElementById('rptBills').textContent    = bills.length;
  const totalRevenue = bills.filter(b=>b.status==='Paid').reduce((s,b)=>s+Number(b.grandTotal),0);
  document.getElementById('rptRevenue').textContent  = fmtCurrency(totalRevenue);

  // Dept breakdown
  const depts = {};
  patients.forEach(p => { if (p.dept) depts[p.dept] = (depts[p.dept]||0)+1; });
  const maxDept = Math.max(...Object.values(depts), 1);

  const chartColors = ['#1a6ef5','#0ea5a0','#7c3aed','#ea6c00','#dc2626','#16a34a','#0284c7','#9333ea'];
  document.getElementById('deptChart').innerHTML = Object.entries(depts).sort((a,b)=>b[1]-a[1]).map(([d,c],i) => `
    <div class="chart-bar-wrap">
      <div class="chart-bar-label"><span>${sanitize(d)}</span><span>${c} patients</span></div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(c/maxDept)*100}%;background:${chartColors[i%chartColors.length]}"></div>
      </div>
    </div>
  `).join('') || '<p style="color:#94a3b8;text-align:center;padding:20px;">No data</p>';

  // Gender
  const genders = { Male:0, Female:0, Other:0 };
  patients.forEach(p => { if (p.gender) genders[p.gender]++; });
  const total = patients.length || 1;
  const gColors = { Male:'#1a6ef5', Female:'#ec4899', Other:'#7c3aed' };
  document.getElementById('genderChart').innerHTML = Object.entries(genders).map(([g,c]) => `
    <div class="chart-bar-wrap">
      <div class="chart-bar-label"><span>${sanitize(g)}</span><span>${c} (${Math.round(c/total*100)}%)</span></div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(c/total)*100}%;background:${gColors[g]}"></div>
      </div>
    </div>
  `).join('');

  // Dept summary table
  const tbody = document.getElementById('deptSummaryBody');
  const deptAppts = {};
  appointments.forEach(a => { if (a.dept) deptAppts[a.dept] = (deptAppts[a.dept]||0)+1; });
  const deptRevenue = {};
  bills.forEach(b => {
    const p = patients.find(x=>x.id===b.patientId);
    if (p && p.dept && b.status==='Paid') deptRevenue[p.dept] = (deptRevenue[p.dept]||0)+Number(b.grandTotal);
  });

  const allDepts = [...new Set([...Object.keys(depts), ...Object.keys(deptAppts)])];
  if (allDepts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">No data</td></tr>';
    return;
  }
  tbody.innerHTML = allDepts.map(d => `
    <tr>
      <td>${sanitize(d)}</td>
      <td>${depts[d]||0}</td>
      <td>${deptAppts[d]||0}</td>
      <td>${fmtCurrency(deptRevenue[d]||0)}</td>
    </tr>
  `).join('');
}

// ─────────────────────────────────────────────────────
// DOCTORS
// ─────────────────────────────────────────────────────
function renderDoctors() {
  const grid = document.getElementById('doctorsGrid');
  if (doctors.length === 0) {
    grid.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">No doctors added yet.</p>';
    return;
  }
  const drColors = ['#1a6ef5','#0ea5a0','#7c3aed','#ea6c00','#dc2626','#16a34a','#0284c7','#9333ea'];
  grid.innerHTML = doctors.map((d,i) => `
    <div class="doctor-card">
      <div class="dr-avatar" style="background:${drColors[i%drColors.length]}">${initials(d.name.replace('Dr. ',''))}</div>
      <div class="dr-name">${sanitize(d.name)}</div>
      <div class="dr-specialty">${sanitize(d.specialty)}</div>
      <span class="status-badge ${statusClass(d.status)}">${sanitize(d.status)}</span>
      <div class="dr-info"><i class="fa fa-phone" style="color:#94a3b8;margin-right:5px;"></i>${sanitize(d.phone||'—')}</div>
      <div class="dr-info"><i class="fa fa-envelope" style="color:#94a3b8;margin-right:5px;"></i>${sanitize(d.email||'—')}</div>
      <div class="dr-info"><i class="fa fa-briefcase" style="color:#94a3b8;margin-right:5px;"></i>${d.experience||0} yrs experience</div>
      <div class="dr-info" style="font-size:.75rem;">${sanitize(d.qualification||'—')}</div>
      <div class="dr-actions">
        <button class="btn-icon edit" onclick="openDoctorModal('${d.id}')" title="Edit"><i class="fa fa-pen"></i></button>
        <button class="btn-icon del"  onclick="deleteDoctor('${d.id}')" title="Delete"><i class="fa fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function openDoctorModal(id = null) {
  editDrId = id;
  if (id) {
    const d = doctors.find(x => x.id === id);
    if (!d) return;
    document.getElementById('doctorModalTitle').innerHTML = '<i class="fa fa-pen"></i> Edit Doctor';
    document.getElementById('drName').value          = d.name;
    document.getElementById('drSpecialty').value     = d.specialty;
    document.getElementById('drPhone').value         = d.phone||'';
    document.getElementById('drEmail').value         = d.email||'';
    document.getElementById('drExperience').value    = d.experience||'';
    document.getElementById('drStatus').value        = d.status;
    document.getElementById('drQualification').value = d.qualification||'';
    document.getElementById('drEditId').value        = id;
  } else {
    document.getElementById('doctorModalTitle').innerHTML = '<i class="fa fa-user-doctor"></i> Add Doctor';
    document.getElementById('doctorForm').reset();
    document.getElementById('drEditId').value = '';
  }
  document.getElementById('doctorModal').classList.remove('hidden');
}

function closeDoctorModal() {
  document.getElementById('doctorModal').classList.add('hidden');
  editDrId = null;
}

function saveDoctor(e) {
  e.preventDefault();
  const id = document.getElementById('drEditId').value || ('DR' + String(Date.now()).slice(-4));
  const dr = {
    id,
    name:          document.getElementById('drName').value.trim(),
    specialty:     document.getElementById('drSpecialty').value,
    phone:         document.getElementById('drPhone').value.trim(),
    email:         document.getElementById('drEmail').value.trim(),
    experience:    document.getElementById('drExperience').value,
    status:        document.getElementById('drStatus').value,
    qualification: document.getElementById('drQualification').value.trim(),
  };

  if (editDrId) {
    const idx = doctors.findIndex(d => d.id === editDrId);
    doctors[idx] = dr;
    showToast('Doctor updated!', 'success');
  } else {
    doctors.push(dr);
    showToast('Doctor added!', 'success');
  }

  saveDoctors();
  closeDoctorModal();
  renderDoctors();
}

async function deleteDoctor(id) {
  const ok = await showConfirm('Delete Doctor?', 'This will remove the doctor from the system.', 'Delete', true);
  if (!ok) return;
  doctors = doctors.filter(d => d.id !== id);
  saveDoctors();
  renderDoctors();
  showToast('Doctor removed.', 'info');
}

// ─────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────
function populatePatientSelect(selectId) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">Select Patient</option>' +
    patients.map(p => `<option value="${p.id}">${sanitize(p.firstName)} ${sanitize(p.lastName)} (${p.id})</option>`).join('');
}

function globalSearchFn() {
  const q = document.getElementById('globalSearch').value.toLowerCase();
  if (!q) return;
  const match = patients.find(p =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
    p.phone.includes(q) || p.id.toLowerCase().includes(q)
  );
  if (match) {
    showSection('patients', document.getElementById('nav-patients'));
    document.getElementById('patientSearch').value = q;
    filterPatients();
  }
}

function exportDashboard() {
  showToast('Dashboard export feature coming soon!', 'info');
}
