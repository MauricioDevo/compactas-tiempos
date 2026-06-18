/**
 * db.js
 * Servicio de Persistencia y Base de Datos (Híbrido: LocalStorage / Supabase)
 * Petroaseo
 */

import { createClient } from '@supabase/supabase-js';

// Intentar leer las variables de entorno de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Verificar si Supabase está configurado
const isSupabaseConfigured = supabaseUrl.trim() !== '' && supabaseAnonKey.trim() !== '';

let supabaseClient = null;
let isConfiguredSuccessfully = false;

if (isSupabaseConfigured) {
  try {
    // Limpiar URL por si tiene espacios en blanco al inicio o al final
    const cleanUrl = supabaseUrl.trim();
    const cleanKey = supabaseAnonKey.trim();
    supabaseClient = createClient(cleanUrl, cleanKey);
    isConfiguredSuccessfully = true;
    console.log('🔌 Conectado a la base de datos de Supabase en tiempo real.');
  } catch (error) {
    console.error('❌ Error al inicializar el cliente de Supabase:', error);
    supabaseClient = null;
    isConfiguredSuccessfully = false;
  }
}

export const supabase = supabaseClient;

if (!isConfiguredSuccessfully) {
  console.log('📁 Utilizando base de datos local del navegador (LocalStorage).');
}

export const PLACAS_PRECONFIGURADAS = [
  'BWR-724',
  'BWP-886',
  'BWQ-764',
  'BWP-917',
  'BWQ-863',
  'BZV-711',
  'BZV-736',
  'BZU-913',
  'CBJ-823'
];

const CONDUCTORES_INICIALES = [
  { id: 'c1111111-1111-1111-1111-111111111111', nombre: 'Paola Tesen', codigo: 'A' },
  { id: 'c2222222-2222-2222-2222-222222222222', nombre: 'Jesus Laban', codigo: 'B' },
  { id: 'c3333333-3333-3333-3333-333333333333', nombre: 'Carlos Flores', codigo: 'C' },
  { id: 'c4444444-4444-4444-4444-444444444444', nombre: 'Juan Quispe', codigo: 'D' },
  { id: 'c5555555-5555-5555-5555-555555555555', nombre: 'Manuel Ramirez', codigo: 'E' },
  { id: 'c6666666-6666-6666-6666-666666666666', nombre: 'Luis Sanchez', codigo: 'F' }
];

const listeners = new Set();
let globalChannel = null;

export const subscribeToDB = (callback) => {
  listeners.add(callback);
  
  // Si estamos en Supabase, creamos un único canal global para todos los oyentes
  if (supabase && !globalChannel) {
    globalChannel = supabase
      .channel('schema-db-changes-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, () => {
        listeners.forEach(cb => cb());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conductores' }, () => {
        listeners.forEach(cb => cb());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencia' }, () => {
        listeners.forEach(cb => cb());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial' }, () => {
        listeners.forEach(cb => cb());
      })
      .subscribe((status) => {
        console.log(`📡 Suscripción global a Supabase activa: ${status}`);
      });
  }

  return () => {
    listeners.delete(callback);
    // Si ya no quedan oyentes locales, removemos el canal global para ahorrar recursos
    if (listeners.size === 0 && globalChannel) {
      supabase.removeChannel(globalChannel);
      globalChannel = null;
      console.log('📡 Suscripción global a Supabase removida (sin oyentes).');
    }
  };
};

const notifySubscribers = () => {
  listeners.forEach(cb => cb());
};

const initializeDB = () => {
  if (!localStorage.getItem('petrolimpio_vehiculos')) {
    const vehiculos = PLACAS_PRECONFIGURADAS.map((placa, index) => ({
      placa,
      orden: index + 1
    }));
    localStorage.setItem('petrolimpio_vehiculos', JSON.stringify(vehiculos));
  }

  if (!localStorage.getItem('petrolimpio_conductores')) {
    localStorage.setItem('petrolimpio_conductores', JSON.stringify(CONDUCTORES_INICIALES));
  }

  if (!localStorage.getItem('petrolimpio_registros')) {
    localStorage.setItem('petrolimpio_registros', JSON.stringify([]));
  }

  if (!localStorage.getItem('petrolimpio_asistencia')) {
    localStorage.setItem('petrolimpio_asistencia', JSON.stringify({}));
  }

  if (!localStorage.getItem('petrolimpio_historial')) {
    localStorage.setItem('petrolimpio_historial', JSON.stringify([]));
  }
};

initializeDB();

export const getVehicles = () => {
  return PLACAS_PRECONFIGURADAS.map((placa, index) => ({ placa, orden: index + 1 }));
};

export const getDrivers = async () => {
  if (supabase) {
    const { data, error } = await supabase.from('conductores').select('*');
    if (error) {
      console.error('Error al obtener conductores en Supabase:', error);
      return [];
    }
    return data || [];
  }
  return JSON.parse(localStorage.getItem('petrolimpio_conductores')) || [];
};

export const addDriver = async (nombre) => {
  if (supabase) {
    // Buscar si ya existe
    const { data: existing, error: searchError } = await supabase
      .from('conductores')
      .select('*')
      .eq('nombre', nombre.trim());
      
    if (searchError) console.error('Error al buscar conductor:', searchError);
    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Contar total para generar el código autosecuencial (A, B, C...)
    const { data: all, error: countError } = await supabase.from('conductores').select('id');
    if (countError) console.error('Error al contar conductores:', countError);
    const count = all ? all.length : 0;
    const codigo = generateDriverCode(count);

    const { data, error } = await supabase
      .from('conductores')
      .insert([{ nombre: nombre.trim(), codigo }])
      .select();

    if (error) console.error('Error al registrar conductor en Supabase:', error);
    if (data && data.length > 0) {
      notifySubscribers();
      return data[0];
    }
  }

  // Fallback LocalStorage
  const drivers = JSON.parse(localStorage.getItem('petrolimpio_conductores')) || [];
  const exists = drivers.find(d => d.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
  if (exists) return exists;

  const codigo = generateDriverCode(drivers.length);
  const newDriver = { id: crypto.randomUUID(), nombre: nombre.trim(), codigo };
  drivers.push(newDriver);
  localStorage.setItem('petrolimpio_conductores', JSON.stringify(drivers));
  notifySubscribers();
  return newDriver;
};

const generateDriverCode = (index) => {
  let code = '';
  let temp = index;
  while (temp >= 0) {
    code = String.fromCharCode((temp % 26) + 65) + code;
    temp = Math.floor(temp / 26) - 1;
  }
  return code;
};

// ----------------------------------------------------
// GESTIÓN DE ASISTENCIA DIARIA MASIVA
// ----------------------------------------------------

// Guardar conductores activos para una fecha específica (Entrada Masiva)
export const saveActiveDriversForDate = async (dateStr, namesArray) => {
  if (supabase) {
    // Registrar cada conductor en Supabase si es nuevo
    for (const name of namesArray) {
      await addDriver(name);
    }
    // Guardar la asistencia
    const { error } = await supabase
      .from('asistencia')
      .upsert({ fecha: dateStr, nombres: namesArray });

    if (error) console.error('Error al guardar asistencia en Supabase:', error);
    notifySubscribers();
    return await getActiveDriversForDate(dateStr);
  }

  // Fallback LocalStorage
  const asistencia = JSON.parse(localStorage.getItem('petrolimpio_asistencia')) || {};
  const driverIds = [];
  for (const name of namesArray) {
    const d = await addDriver(name);
    driverIds.push(d.id);
  }

  asistencia[dateStr] = driverIds;
  localStorage.setItem('petrolimpio_asistencia', JSON.stringify(asistencia));
  notifySubscribers();
  
  return await getActiveDriversForDate(dateStr);
};

// Obtener conductores que asistieron en una fecha
export const getActiveDriversForDate = async (dateStr) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('asistencia')
      .select('nombres')
      .eq('fecha', dateStr)
      .maybeSingle();

    if (error) console.error('Error al obtener asistencia en Supabase:', error);
    if (!data || !data.nombres || data.nombres.length === 0) return [];
    
    // Obtener los objetos conductores correspondientes a los nombres de asistencia
    const allDrivers = await getDrivers();
    return allDrivers.filter(d => data.nombres.includes(d.nombre));
  }

  // Fallback LocalStorage
  const asistencia = JSON.parse(localStorage.getItem('petrolimpio_asistencia')) || {};
  const activeIds = asistencia[dateStr] || [];
  const allDrivers = await getDrivers();
  return allDrivers.filter(d => activeIds.includes(d.id));
};

// ----------------------------------------------------
// HISTORIAL DE CAMBIOS Y AUDITORÍA
// ----------------------------------------------------
export const logAction = async (accion, record, supervisorOverride) => {
  try {
    const drivers = await getDrivers();
    const driver = drivers.find(d => d.id === record.conductor_id);
    const conductor_nombre = driver ? driver.nombre : 'Desconocido';
    const supervisor = supervisorOverride || record.supervisor || 'Supervisor';

    const logEntry = {
      id: crypto.randomUUID(),
      fecha_accion: new Date().toISOString(),
      supervisor: supervisor.trim(),
      accion,
      registro_id: record.id,
      placa: record.placa,
      conductor_nombre,
      fase: record.fase,
      hora_inicio: record.hora_inicio,
      hora_termino: record.hora_termino,
      observaciones: record.observaciones || null,
      fecha_registro: record.fecha
    };

    if (supabase) {
      const { error } = await supabase.from('historial').insert([logEntry]);
      if (error) {
        console.error('Error al guardar log en Supabase:', error);
      }
      notifySubscribers();
      return logEntry;
    }

    // Fallback LocalStorage
    const history = JSON.parse(localStorage.getItem('petrolimpio_historial')) || [];
    history.push(logEntry);
    localStorage.setItem('petrolimpio_historial', JSON.stringify(history));
    notifySubscribers();
    return logEntry;
  } catch (err) {
    console.error('Error en logAction:', err);
  }
};

export const getHistory = async () => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('historial')
        .select('*')
        .order('fecha_accion', { ascending: false });
      if (error) {
        console.error('Error al obtener historial en Supabase:', error);
        return [];
      }
      return data || [];
    }

    // Fallback LocalStorage
    const parsed = JSON.parse(localStorage.getItem('petrolimpio_historial'));
    const history = Array.isArray(parsed) ? parsed : [];
    return [...history].reverse();
  } catch (err) {
    console.error('Error en getHistory:', err);
    return [];
  }
};

// ----------------------------------------------------
// REGISTROS OPERATIVOS
// ----------------------------------------------------
export const getRecords = async (dateStr) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('registros')
      .select('*')
      .eq('fecha', dateStr);

    if (error) {
      console.error('Error al obtener registros en Supabase:', error);
      return [];
    }
    return data || [];
  }

  // Fallback LocalStorage
  const records = JSON.parse(localStorage.getItem('petrolimpio_registros')) || [];
  return records.filter(r => r.fecha === dateStr);
};

export const saveRecord = async (recordData) => {
  const horaInicio = recordData.hora_inicio;
  const hourNum = parseInt(horaInicio.split(':')[0], 10);
  let turno = 'Mañana';
  if (hourNum >= 14 && hourNum < 22) {
    turno = 'Tarde';
  } else if (hourNum >= 22 || hourNum < 6) {
    turno = 'Noche';
  }

  const id = recordData.id || crypto.randomUUID();
  const newRecord = {
    ...recordData,
    id,
    turno,
    updated_at: new Date().toISOString()
  };

  // Determinar si es creación o edición
  let isEdit = false;
  try {
    if (recordData.id) {
      if (supabase) {
        const { data } = await supabase.from('registros').select('id').eq('id', recordData.id).maybeSingle();
        if (data) isEdit = true;
      } else {
        const records = JSON.parse(localStorage.getItem('petrolimpio_registros')) || [];
        const existing = records.find(r => r.id === recordData.id);
        if (existing) isEdit = true;
      }
    }
  } catch (err) {
    console.error('Error al detectar si es edición:', err);
  }

  if (supabase) {
    const { error } = await supabase.from('registros').upsert(newRecord);
    if (error) console.error('Error al guardar registro en Supabase:', error);
    
    // Log al historial
    await logAction(isEdit ? 'EDITAR' : 'CREAR', newRecord, newRecord.supervisor);

    notifySubscribers();
    return newRecord;
  }

  // Fallback LocalStorage
  const records = JSON.parse(localStorage.getItem('petrolimpio_registros')) || [];
  const existingIndex = records.findIndex(r => r.id === id);
  if (existingIndex > -1) {
    records[existingIndex] = newRecord;
  } else {
    records.push(newRecord);
  }

  localStorage.setItem('petrolimpio_registros', JSON.stringify(records));
  
  // Log al historial
  await logAction(isEdit ? 'EDITAR' : 'CREAR', newRecord, newRecord.supervisor);

  notifySubscribers();
  return newRecord;
};

export const deleteRecord = async (id, supervisorName) => {
  let recordToDelete = null;
  try {
    if (supabase) {
      const { data } = await supabase.from('registros').select('*').eq('id', id).maybeSingle();
      recordToDelete = data;
    } else {
      const records = JSON.parse(localStorage.getItem('petrolimpio_registros')) || [];
      recordToDelete = records.find(r => r.id === id);
    }
  } catch (err) {
    console.error('Error al obtener registro antes de eliminar:', err);
  }

  // Registrar en el historial antes de eliminar físicamente
  if (recordToDelete) {
    const activeSupervisor = supervisorName || localStorage.getItem('petrolimpio_active_supervisor') || 'Supervisor';
    await logAction('ELIMINAR', recordToDelete, activeSupervisor);
  }

  if (supabase) {
    const { error } = await supabase.from('registros').delete().eq('id', id);
    if (error) console.error('Error al eliminar registro en Supabase:', error);
    notifySubscribers();
    return;
  }

  // Fallback LocalStorage
  let records = JSON.parse(localStorage.getItem('petrolimpio_registros')) || [];
  records = records.filter(r => r.id !== id);
  localStorage.setItem('petrolimpio_registros', JSON.stringify(records));
  notifySubscribers();
};

export const getMinutesFromTime = (timeStr) => {
  if (!timeStr) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (h < 6) {
    return (h + 18) * 60 + m;
  } else {
    return (h - 6) * 60 + m;
  }
};

export const formatMinutesToTime = (minutes) => {
  let totalHours = Math.floor(minutes / 60) + 6;
  let actualHours = totalHours % 24;
  let mins = minutes % 60;
  return `${String(actualHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};
