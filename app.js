// ===============================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos valores por los de tu proyecto.
// Usa la publishable key (sb_publishable_...) o
// la anon key antigua. NUNCA uses service_role.
// ===============================================
const SUPABASE_URL = "https://typpgridksfoyfjlkyqg.supabase.co";
const SUPABASE_KEY = "sb_publishable_K82y0UScn6J1DPmYcW4OEw_JLkKUYhw";

let db = null;
let currentModule = "";
let editingId = null;
let records = { alumnos: [], profesores: [], cursos: [], inscripciones: [] };

const config = {
  alumnos: {
    title: "alumno", table: "alumnos", id: "id_estudiante",
    fields: [
      { name: "apellidos", label: "Apellidos", type: "text", required: true },
      { name: "nombres", label: "Nombres", type: "text", required: true }
    ],
    columns: ["id_estudiante", "apellidos", "nombres"],
    render: r => [r.id_estudiante, r.apellidos, r.nombres]
  },
  profesores: {
    title: "profesor", table: "profesores", id: "id_profesor",
    fields: [
      { name: "apellidos", label: "Apellidos", type: "text", required: true },
      { name: "nombres", label: "Nombres", type: "text", required: true }
    ],
    columns: ["id_profesor", "apellidos", "nombres"],
    render: r => [r.id_profesor, r.apellidos, r.nombres]
  },
  cursos: {
    title: "curso", table: "cursos", id: "id_curso",
    fields: [
      { name: "nombre_curso", label: "Nombre del curso", type: "text", required: true },
      { name: "id_profesor", label: "Profesor responsable", type: "select", source: "profesores", required: true }
    ],
    columns: ["id_curso", "nombre_curso", "profesor"],
    render: r => [r.id_curso, r.nombre_curso, r.profesores ? `${r.profesores.apellidos}, ${r.profesores.nombres}` : "Sin asignar"]
  },
  inscripciones: {
    title: "inscripción", table: "inscripciones", id: "id_inscripcion",
    fields: [
      { name: "id_estudiante", label: "Alumno", type: "select", source: "alumnos", required: true },
      { name: "id_curso", label: "Curso", type: "select", source: "cursos", required: true },
      { name: "fecha_matricula", label: "Fecha de matrícula", type: "date", required: true }
    ],
    columns: ["id_inscripcion", "alumno", "curso", "fecha_matricula"],
    render: r => [
      r.id_inscripcion,
      r.alumnos ? `${r.alumnos.apellidos}, ${r.alumnos.nombres}` : "Alumno no disponible",
      r.cursos?.nombre_curso || "Curso no disponible",
      formatDate(r.fecha_matricula)
    ]
  }
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(new Date());
  document.getElementById("year").textContent = new Date().getFullYear();

  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  document.querySelectorAll("[data-create]").forEach(button => {
    button.addEventListener("click", () => openForm(button.dataset.create));
  });
  document.querySelectorAll("[data-search]").forEach(input => {
    input.addEventListener("input", () => renderTable(input.dataset.search));
  });
  document.getElementById("recordForm").addEventListener("submit", saveRecord);
  document.getElementById("closeModal").addEventListener("click", closeForm);
  document.getElementById("cancelModal").addEventListener("click", closeForm);
  document.getElementById("modalBackdrop").addEventListener("click", e => {
    if (e.target.id === "modalBackdrop") closeForm();
  });
  document.getElementById("refreshDashboard").addEventListener("click", loadAll);
  document.getElementById("mobileMenu").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  if (!window.supabase) {
    setConnection(false, "No se cargó Supabase");
    notify("No se pudo cargar la librería de Supabase. Revisa tu conexión a internet.", true);
    return;
  }
  if (SUPABASE_URL.startsWith("PEGA_AQUI") || SUPABASE_KEY.startsWith("PEGA_AQUI")) {
    setConnection(false, "Falta configurar Supabase");
    notify("Primero coloca la URL y la publishable key en app.js.", true);
    return;
  }

  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  await loadAll();
}

function setConnection(online, message) {
  const dot = document.getElementById("connectionDot");
  dot.className = `connection-dot ${online ? "online" : "offline"}`;
  document.getElementById("connectionText").textContent = message;
}

async function loadAll() {
  if (!db) return;
  try {
    const requests = await Promise.all([
      db.from("alumnos").select("*").order("id_estudiante", { ascending: true }),
      db.from("profesores").select("*").order("id_profesor", { ascending: true }),
      db.from("cursos").select("*, profesores(id_profesor, nombres, apellidos)").order("id_curso", { ascending: true }),
      db.from("inscripciones").select("*, alumnos(id_estudiante, nombres, apellidos), cursos(id_curso, nombre_curso)").order("id_inscripcion", { ascending: true })
    ]);
    const names = ["alumnos", "profesores", "cursos", "inscripciones"];
    for (let i = 0; i < requests.length; i++) {
      if (requests[i].error) throw requests[i].error;
      records[names[i]] = requests[i].data || [];
    }
    setConnection(true, "Conectado a Supabase");
    updateDashboard();
    Object.keys(config).forEach(renderTable);
  } catch (error) {
    console.error(error);
    setConnection(false, "Error de conexión");
    notify(`No se pudieron cargar los datos: ${error.message}`, true);
  }
}

function updateDashboard() {
  document.getElementById("totalAlumnos").textContent = records.alumnos.length;
  document.getElementById("totalProfesores").textContent = records.profesores.length;
  document.getElementById("totalCursos").textContent = records.cursos.length;
  document.getElementById("totalInscripciones").textContent = records.inscripciones.length;
}

function showView(view) {
  document.querySelectorAll(".page-view").forEach(section => section.classList.remove("active"));
  const target = document.getElementById(`${view}View`);
  if (!target) return;
  target.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  const titles = { dashboard: "Resumen general", alumnos: "Gestión de alumnos", profesores: "Gestión de profesores", cursos: "Gestión de cursos", inscripciones: "Gestión de inscripciones" };
  document.getElementById("pageTitle").textContent = titles[view] || "Centro de Capacitación";
  document.getElementById("sidebar").classList.remove("open");
  if (view !== "dashboard") renderTable(view);
}

function renderTable(module) {
  const cfg = config[module];
  if (!cfg) return;
  const body = document.getElementById(`${module}Body`);
  const search = document.querySelector(`[data-search="${module}"]`)?.value.toLowerCase() || "";
  const filtered = records[module].filter(row => JSON.stringify(cfg.render(row)).toLowerCase().includes(search));
  document.getElementById(`count${capitalize(module)}`).textContent = `${filtered.length} registro(s)`;
  if (!filtered.length) {
    body.innerHTML = `<tr><td class="empty-row" colspan="${cfg.columns.length + 1}">${search ? "No se encontraron resultados." : "Todavía no hay registros. Utiliza el botón para agregar uno."}</td></tr>`;
    return;
  }
  body.innerHTML = filtered.map(row => {
    const cells = cfg.render(row).map((value, index) => `<td class="${index === 0 ? "id-cell" : ""}">${escapeHTML(value ?? "—")}</td>`).join("");
    return `<tr>${cells}<td class="actions-cell">
      <button class="action-btn" data-edit="${module}" data-id="${row[cfg.id]}">Editar</button>
      <button class="action-btn delete" data-delete="${module}" data-id="${row[cfg.id]}">Eliminar</button>
    </td></tr>`;
  }).join("");
  body.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => openForm(module, Number(button.dataset.id))));
  body.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => deleteRecord(module, Number(button.dataset.id))));
}

function openForm(module, id = null) {
  currentModule = module;
  editingId = id;
  const cfg = config[module];
  const record = id ? records[module].find(item => Number(item[cfg.id]) === id) : {};
  document.getElementById("modalTitle").textContent = `${id ? "Editar" : "Nuevo"} ${cfg.title}`;
  document.getElementById("saveButton").textContent = id ? "Guardar cambios" : "Guardar registro";
  const fields = document.getElementById("formFields");
  fields.innerHTML = cfg.fields.map(field => {
    const value = record?.[field.name] ?? (field.type === "date" ? new Date().toISOString().slice(0, 10) : "");
    let control = "";
    if (field.type === "select") {
      const options = getOptions(field.source);
      control = `<select class="form-control" id="field-${field.name}" name="${field.name}" ${field.required ? "required" : ""}>
        <option value="">Selecciona una opción</option>
        ${options.map(option => `<option value="${option.value}" ${String(value) === String(option.value) ? "selected" : ""}>${escapeHTML(option.label)}</option>`).join("")}
      </select>`;
    } else {
      control = `<input class="form-control" id="field-${field.name}" name="${field.name}" type="${field.type}" value="${escapeHTML(value)}" ${field.required ? "required" : ""}>`;
    }
    return `<div class="field"><label for="field-${field.name}">${field.label}</label>${control}</div>`;
  }).join("");
  document.getElementById("modalBackdrop").hidden = false;
}

function getOptions(source) {
  if (source === "alumnos") return records.alumnos.map(r => ({ value: r.id_estudiante, label: `${r.apellidos}, ${r.nombres}` }));
  if (source === "profesores") return records.profesores.map(r => ({ value: r.id_profesor, label: `${r.apellidos}, ${r.nombres}` }));
  if (source === "cursos") return records.cursos.map(r => ({ value: r.id_curso, label: r.nombre_curso }));
  return [];
}

function closeForm() {
  document.getElementById("modalBackdrop").hidden = true;
  document.getElementById("recordForm").reset();
  editingId = null;
}

async function saveRecord(event) {
  event.preventDefault();
  if (!db) return notify("No hay conexión con Supabase.", true);
  const cfg = config[currentModule];
  const formData = new FormData(event.currentTarget);
  const payload = {};
  cfg.fields.forEach(field => {
    const value = formData.get(field.name);
    payload[field.name] = field.type === "select" ? Number(value) : value;
  });

  const button = document.getElementById("saveButton");
  button.disabled = true;
  button.textContent = "Guardando...";
  try {
    let query = db.from(cfg.table);
    if (editingId) {
      const result = await query.update(payload).eq(cfg.id, editingId);
      if (result.error) throw result.error;
      notify("Registro actualizado correctamente.");
    } else {
      const result = await query.insert(payload);
      if (result.error) throw result.error;
      notify("Registro creado correctamente.");
    }
    closeForm();
    await loadAll();
  } catch (error) {
    console.error(error);
    notify(`No se pudo guardar: ${error.message}`, true);
  } finally {
    button.disabled = false;
    button.textContent = editingId ? "Guardar cambios" : "Guardar registro";
  }
}

async function deleteRecord(module, id) {
  if (!confirm("¿Seguro que deseas eliminar este registro? Esta acción no se puede deshacer.")) return;
  const cfg = config[module];
  try {
    const { error } = await db.from(cfg.table).delete().eq(cfg.id, id);
    if (error) throw error;
    notify("Registro eliminado correctamente.");
    await loadAll();
  } catch (error) {
    console.error(error);
    notify(`No se pudo eliminar: ${error.message}`, true);
  }
}

function formatDate(value) {
  if (!value) return "—";
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}
function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
let toastTimer;
function notify(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3800);
}
