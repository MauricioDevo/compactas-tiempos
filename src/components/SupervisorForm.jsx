import React, { useState, useEffect } from 'react';
import { 
  getDrivers, 
  addDriver, 
  saveRecord, 
  deleteRecord,
  getRecords,
  saveActiveDriversForDate,
  getActiveDriversForDate,
  PLACAS_PRECONFIGURADAS 
} from '../services/db';
import { 
  Calendar, 
  Truck, 
  Clock, 
  Trash2, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2, 
  AlertTriangle,
  Users
} from 'lucide-react';

export default function SupervisorForm({ 
  selectedDate, 
  onRecordSaved, 
  onDateChange, 
  initialPlaca = '', 
  initialPaso = 1,
  onPasoChange,
  onPlacaChange,
  registroAEditar = null,
  onCancelEdit,
  records = []
}) {
  // Estado global del flujo:
  // 1 = Cabecera (Fecha/Supervisor)
  // 2 = Asistencia Masiva
  // 3 = Tablero de Placas
  // 4 = Registro de Tiempos del Vehículo
  const [paso, setPaso] = useState(initialPaso);
  const [supervisor, setSupervisor] = useState(() => localStorage.getItem('petrolimpio_active_supervisor') || '');
  const [fecha, setFecha] = useState(selectedDate);
  const [placaSeleccionada, setPlacaSeleccionada] = useState(initialPlaca);

  // Conductores
  const [conductoresActivosDia, setConductoresActivosDia] = useState([]); // Los de hoy
  const [todosLosConductores, setTodosLosConductores] = useState([]); // Histórico
  const [asistenciaInput, setAsistenciaInput] = useState(''); // Textarea para ingreso masivo
  const [conductorNombreInput, setConductorNombreInput] = useState(''); // Nombre digitado en Paso 4

  // Formulario del segmento
  const [fase, setFase] = useState('emmsa'); // 'emmsa' (Verde) o 'viaje' (Naranja)
  const [horaInicio, setHoraInicio] = useState('');
  const [horaTermino, setHoraTermino] = useState('');

  // Filtro de registros en base a la placa seleccionada (Derivado de props)
  const registrosPlaca = records.filter(r => r.placa === placaSeleccionada && r.fecha === fecha);

  // Mensajes de Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Helper functions to notify parent App of step or plate changes
  const cambiarPaso = (nuevoPaso) => {
    setPaso(nuevoPaso);
    if (onPasoChange) onPasoChange(nuevoPaso);
  };

  const cambiarPlaca = (nuevaPlaca) => {
    setPlacaSeleccionada(nuevaPlaca);
    if (onPlacaChange) onPlacaChange(nuevaPlaca);
  };

  useEffect(() => {
    const cargarConductoresGlobales = async () => {
      try {
        const data = await getDrivers();
        setTodosLosConductores(data);
      } catch (err) {
        console.error('Error al cargar conductores globales:', err);
      }
    };
    cargarConductoresGlobales();
  }, []);

  useEffect(() => {
    setFecha(selectedDate);
  }, [selectedDate]);

  // Sincronizar si cambian las propiedades iniciales externas
  useEffect(() => {
    if (initialPlaca) {
      setPlacaSeleccionada(initialPlaca);
      setPaso(initialPaso);
    }
  }, [initialPlaca, initialPaso]);

  // Cargar asistencia al cambiar placa o fecha
  useEffect(() => {
    if (fecha) {
      const cargarActivos = async () => {
        try {
          const activos = await getActiveDriversForDate(fecha);
          setConductoresActivosDia(activos);
          
          // Pre-cargar la caja de asistencia masiva si ya hay activos
          if (activos.length > 0 && paso === 2) {
            setAsistenciaInput(activos.map(a => a.nombre).join(', '));
          }
        } catch (err) {
          console.error('Error al cargar conductores activos:', err);
        }
      };
      cargarActivos();
    }
  }, [fecha, paso]);

  // Detectar modo edición y cargar valores
  useEffect(() => {
    if (registroAEditar && todosLosConductores.length > 0) {
      const cond = todosLosConductores.find(c => c.id === registroAEditar.conductor_id);
      setConductorNombreInput(cond ? cond.nombre : '');
      setFase(registroAEditar.fase);
      setHoraInicio(registroAEditar.hora_inicio);
      setHoraTermino(registroAEditar.hora_termino);
      
      // Asegurar que navegamos a Paso 4 de la placa correcta
      setPlacaSeleccionada(registroAEditar.placa);
      setPaso(4);
      if (onPlacaChange) onPlacaChange(registroAEditar.placa);
      if (onPasoChange) onPasoChange(4);
    }
  }, [registroAEditar, todosLosConductores]);

  // PASO 1 -> PASO 2
  const handleSiguientePaso1 = async (e) => {
    e.preventDefault();
    if (!fecha || !supervisor.trim()) {
      setErrorMsg('Por favor ingresa la Fecha y tu Nombre de Supervisor.');
      return;
    }
    setErrorMsg('');
    localStorage.setItem('petrolimpio_active_supervisor', supervisor);
    
    if (onDateChange) {
      onDateChange(fecha);
    }

    try {
      // Cargar asistencia si ya existe para esta fecha
      const activos = await getActiveDriversForDate(fecha);
      setConductoresActivosDia(activos);
      setAsistenciaInput(activos.map(a => a.nombre).join(', '));
      cambiarPaso(2);
    } catch (err) {
      console.error('Error al iniciar jornada:', err);
      setErrorMsg('Error al conectar con la base de datos de Supabase. Revisa tu conexión.');
    }
  };

  // PASO 2 -> PASO 3 (Guardado masivo de asistencia)
  const handleGuardarAsistenciaMasiva = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Separar nombres por comas o saltos de línea y limpiar espacios
    const nombres = asistenciaInput
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(Boolean);

    if (nombres.length === 0) {
      setErrorMsg('Debes ingresar al menos el nombre de un conductor que asistió hoy.');
      return;
    }

    try {
      // Guardar asistencia en la base de datos (registra conductores nuevos en background)
      const listadoActivos = await saveActiveDriversForDate(fecha, nombres);
      setConductoresActivosDia(listadoActivos);
      const data = await getDrivers();
      setTodosLosConductores(data); // Actualizar catálogo global
      
      setSuccessMsg('¡Asistencia diaria guardada!');
      setTimeout(() => {
        setSuccessMsg('');
        cambiarPaso(3); // Pasar al tablero de vehículos
      }, 1000);
    } catch (err) {
      setErrorMsg('Error al registrar la asistencia masiva.');
    }
  };

  const abrirRegistroVehiculo = (placa) => {
    cambiarPlaca(placa);
    setConductorNombreInput('');
    setFase('emmsa');
    setHoraInicio('');
    setHoraTermino('');
    setErrorMsg('');
    setSuccessMsg('');
    cambiarPaso(4);
  };

  const establecerHoraActual = (setter) => {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    setter(`${horas}:${minutos}`);
  };

  const handleCancelarEdicion = () => {
    setConductorNombreInput('');
    setFase('emmsa');
    setHoraInicio('');
    setHoraTermino('');
    setErrorMsg('');
    setSuccessMsg('');
    if (onCancelEdit) onCancelEdit();
  };

  // PASO 4: Guardar segmento (Soporta creación y actualización)
  const handleGuardarSegmento = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const nombreConductor = conductorNombreInput.trim();
    if (!nombreConductor) {
      setErrorMsg('Escribe el nombre del conductor.');
      return;
    }
    if (!horaInicio || !horaTermino) {
      setErrorMsg('Debes ingresar la Hora Inicio y Hora Término.');
      return;
    }

    try {
      // Registrar conductor si es nuevo
      const condRegistrado = await addDriver(nombreConductor);
      
      // Asegurar que quede marcado en la asistencia de hoy
      const nombresHoy = [...conductoresActivosDia.map(c => c.nombre)];
      if (!nombresHoy.includes(condRegistrado.nombre)) {
        nombresHoy.push(condRegistrado.nombre);
        const listadoActivos = await saveActiveDriversForDate(fecha, nombresHoy);
        setConductoresActivosDia(listadoActivos);
      }

      const listadoConductores = await getDrivers();
      setTodosLosConductores(listadoConductores);

      const recordData = {
        id: registroAEditar ? registroAEditar.id : undefined, // Conservar ID para sobrescribir si editamos
        fecha,
        supervisor,
        placa: placaSeleccionada,
        conductor_id: condRegistrado.id,
        fase,
        hora_inicio: horaInicio,
        hora_termino: horaTermino,
        n_guia: 'G-DIARIA'
      };

      await saveRecord(recordData);
      setSuccessMsg(registroAEditar ? '¡Registro actualizado correctamente!' : '¡Tiempo guardado correctamente!');
      
      setConductorNombreInput('');
      setHoraInicio('');
      setHoraTermino('');
      
      if (registroAEditar && onCancelEdit) {
        onCancelEdit(); // Limpiar el estado de edición en el padre
      }
      
      if (onRecordSaved) onRecordSaved();

      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      setErrorMsg('Error al guardar los datos.');
    }
  };

  const handleEliminarSegmento = async (id) => {
    if (window.confirm('¿Deseas eliminar este bloque de tiempo?')) {
      await deleteRecord(id);
      if (onRecordSaved) onRecordSaved();
    }
  };

  const obtenerCantidadSegmentos = (placa) => {
    return records.filter(r => r.placa === placa).length;
  };

  return (
    <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 shadow-xl overflow-hidden min-h-[450px] flex flex-col">
      
      {/* ----------------- PASO 1: CONFIGURAR JORNADA ----------------- */}
      {paso === 1 && (
        <form onSubmit={handleSiguientePaso1} className="p-4 sm:p-6 flex flex-col justify-between flex-1 gap-5">
          <div className="flex flex-col gap-4">
            <div className="border-b-2 border-slate-800 pb-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Calendar className="text-indigo-400 w-6 h-6 sm:w-7 sm:h-7" />
                Iniciar Registro Diario
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Selecciona la fecha de la jornada y escribe tu nombre de supervisor.
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-200 block mb-1.5">
                  Fecha de la Jornada (Día Operativo):
                </label>
                <input 
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-700/80 rounded-xl px-3.5 py-3 text-base sm:text-lg font-black text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  required
                />
                <span className="text-[10px] sm:text-xs text-slate-550 font-bold mt-1 block">
                  * Nota: Si vas a registrar la jornada de ayer, selecciona la fecha de ayer.
                </span>
              </div>

              <div>
                <label className="text-sm sm:text-base font-bold text-slate-200 block mb-1.5">
                  Tu Nombre (Supervisor):
                </label>
                <input 
                  type="text"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  placeholder="Escribe tu nombre"
                  className="w-full bg-slate-950 border-2 border-slate-700/80 rounded-xl px-3.5 py-3 text-base sm:text-lg font-black text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-950/45 border-2 border-red-500/30 text-red-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" /> {errorMsg}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 sm:py-4.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base sm:text-lg font-black shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer mt-3"
          >
            Siguiente: Registrar Conductores <ChevronRight className="w-5 h-5" />
          </button>
        </form>
      )}

      {/* ----------------- PASO 2: ASISTENCIA MASIVA DE CONDUCTORES ----------------- */}
      {paso === 2 && (
        <form onSubmit={handleGuardarAsistenciaMasiva} className="p-4 sm:p-6 flex flex-col justify-between flex-1 gap-5">
          <div className="flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-800 pb-2.5 gap-2">
              <div>
                <span className="text-[10px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-black text-indigo-400">
                  Fecha: {fecha}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2">
                  <Users className="text-indigo-400 w-5 h-5 sm:w-6 sm:h-6" />
                  Ingreso Masivo de Conductores
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setPaso(1)}
                className="text-[10px] sm:text-xs text-slate-400 font-bold border-2 border-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-850 self-start sm:self-auto"
              >
                ← Volver al Paso 1
              </button>
            </div>

            <p className="text-slate-450 text-[11px] sm:text-xs font-semibold leading-relaxed">
              Escribe o pega los nombres de los conductores que asistieron en esta jornada. 
              Sepáralos usando **comas** o **saltos de línea**.
            </p>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-350 block mb-1.5">
                Lista de Conductores Asistentes:
              </label>
              <textarea
                value={asistenciaInput}
                onChange={(e) => setAsistenciaInput(e.target.value)}
                placeholder="Ej. Paola Tesen, Jesus Laban, Carlos Flores, Juan Quispe"
                rows={4}
                className="w-full bg-slate-950 border-2 border-slate-700/80 rounded-xl px-3 py-3 text-sm sm:px-4 sm:py-4 sm:text-base font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 resize-none"
                required
              />
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-bold mt-1 block">
                * Esto creará el catálogo del día y facilitará la escritura de horarios en las compactas.
              </span>
            </div>

            {/* Vista Previa Rápida de Códigos */}
            {asistenciaInput.trim() && (
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-550 uppercase block mb-1">Vista Previa de Códigos:</span>
                <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto pr-1">
                  {asistenciaInput.split(/[\n,]+/).map(n => n.trim()).filter(Boolean).map((nombre, idx) => (
                    <span key={idx} className="text-[9px] sm:text-[10px] bg-slate-900 border border-slate-800 text-slate-350 px-2 py-0.5 rounded">
                      {nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-950/45 border-2 border-red-500/30 text-red-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" /> {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-950/45 border-2 border-emerald-500/30 text-emerald-250 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0" /> {successMsg}
              </div>
            )}

          </div>

          <button
            type="submit"
            className="w-full py-3.5 sm:py-4.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base sm:text-lg font-black shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer mt-3"
          >
            Confirmar Asistencia y Seleccionar Compactas <ChevronRight className="w-5 h-5" />
          </button>
        </form>
      )}

      {/* ----------------- PASO 3: TABLERO DE PLACAS ----------------- */}
      {paso === 3 && (
        <form onSubmit={(e) => e.preventDefault()} className="p-4 sm:p-6 flex flex-col justify-between flex-1 gap-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-800 pb-2.5 gap-2">
              <div>
                <span className="text-[10px] bg-indigo-600 text-white font-black px-2.5 py-0.5 rounded uppercase">
                  Supervisor: {supervisor}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                  Selecciona la Compacta a registrar:
                </h2>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setPaso(2)}
                  className="text-[10px] sm:text-xs text-slate-400 font-bold border-2 border-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-850"
                >
                  ← Editar Asistencia
                </button>
                <button 
                  type="button"
                  onClick={() => setPaso(1)}
                  className="text-[10px] sm:text-xs text-slate-400 font-bold border-2 border-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-850"
                >
                  ← Cambiar Día
                </button>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] sm:text-xs font-semibold">
              Jornada seleccionada: <span className="text-slate-200 font-black">{fecha}</span>. 
              Asistencia hoy: <span className="text-indigo-400 font-bold">{conductoresActivosDia.length} conductores</span>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-1">
              {PLACAS_PRECONFIGURADAS.map((placa) => {
                const count = obtenerCantidadSegmentos(placa);
                return (
                  <button
                    key={placa}
                    type="button"
                    onClick={() => abrirRegistroVehiculo(placa)}
                    className="flex flex-col items-center justify-center p-3.5 sm:p-5 bg-slate-950/70 border-2 border-slate-800 hover:border-indigo-500 rounded-xl sm:rounded-2xl hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
                  >
                    <Truck className="text-slate-500 group-hover:text-indigo-400 w-6 h-6 sm:w-8 sm:h-8 mb-1.5 sm:mb-2 transition-colors" />
                    <span className="text-sm sm:text-lg font-black text-white group-hover:text-indigo-300 transition-colors">
                      {placa}
                    </span>
                    <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full mt-1.5 ${
                      count > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 text-slate-500'
                    }`}>
                      {count === 1 ? '1 tiempo' : `${count} tiempos`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="text-center text-[10px] sm:text-xs text-slate-500 font-semibold border-t border-slate-850 pt-3 mt-1">
            Selecciona una placa para ver sus tiempos actuales o ingresar nuevos movimientos.
          </div>
        </form>
      )}

      {/* ----------------- PASO 4: REGISTRO DE TIEMPOS POR PLACA ----------------- */}
      {paso === 4 && (
        <div className="p-4 sm:p-6 flex flex-col justify-between flex-1 gap-5">
          <div className="flex flex-col gap-4">
            
            {/* Header de Placa */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPaso(3)}
                  className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-850 text-slate-400 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <div>
                  <span className="text-[9px] sm:text-[10px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-black text-indigo-400">
                    Compacta: {placaSeleccionada}
                  </span>
                  <h2 className="text-sm sm:text-lg font-black text-white mt-1">Llenar Horario</h2>
                </div>
              </div>
              
              <div className="text-right text-[10px] sm:text-xs">
                <p className="text-slate-550 font-bold uppercase">Fecha Operación</p>
                <p className="text-slate-200 font-extrabold">{fecha}</p>
              </div>
            </div>

            {/* DOS COLUMNAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start mt-1">
              
              {/* Formulario de Adición */}
              <form onSubmit={handleGuardarSegmento} className="flex flex-col gap-3.5">
                
                {/* Input de Texto con Autocompletado */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-350 block mb-1">
                    Conductor:
                  </label>
                  <input
                    type="text"
                    list="conductores-asistieron-dia"
                    value={conductorNombreInput}
                    onChange={(e) => setConductorNombreInput(e.target.value)}
                    placeholder="Escribe el nombre del conductor"
                    className="w-full bg-slate-950 border-2 border-slate-700/85 rounded-xl px-3 py-2.5 text-sm sm:text-base font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500"
                    required
                    autoFocus
                  />
                  
                  <datalist id="conductores-asistieron-dia">
                    {conductoresActivosDia.map(c => (
                      <option key={c.id} value={c.nombre} />
                    ))}
                  </datalist>
                  <span className="text-[9px] sm:text-[10px] text-indigo-400 font-bold mt-1 block">
                    * Sugiriendo conductores del día ({conductoresActivosDia.length} en total).
                  </span>
                </div>

                {/* Actividad / Fase */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-350 block mb-1.5">
                    Actividad / Fase:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setFase('emmsa')}
                      className={`py-2.5 sm:py-3.5 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                        fase === 'emmsa'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-black shadow-lg'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 text-slate-500'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full block ${fase === 'emmsa' ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                      🟢 EMMSA (Carga)
                    </button>

                    <button
                      type="button"
                      onClick={() => setFase('viaje')}
                      className={`py-2.5 sm:py-3.5 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                        fase === 'viaje'
                          ? 'bg-orange-500/15 border-orange-500 text-orange-300 font-black shadow-lg'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 text-slate-500'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full block ${fase === 'viaje' ? 'bg-orange-500' : 'bg-slate-700'}`}></span>
                      🟠 Viaje Relleno
                    </button>
                  </div>
                </div>

                {/* Horas */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-350 block mb-1">
                      Hora Inicio:
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        className="flex-1 bg-slate-950 border-2 border-slate-700/60 rounded-xl px-2 py-2 text-xs sm:text-lg sm:py-3 sm:px-3 font-black text-white focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => establecerHoraActual(setHoraInicio)}
                        className="px-2 bg-slate-850 border-2 border-slate-750 rounded-xl text-[10px] font-bold text-slate-400 active:scale-95 cursor-pointer"
                      >
                        Ahora
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-350 block mb-1">
                      Hora Término:
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="time"
                        value={horaTermino}
                        onChange={(e) => setHoraTermino(e.target.value)}
                        className="flex-1 bg-slate-950 border-2 border-slate-700/60 rounded-xl px-2 py-2 text-xs sm:text-lg sm:py-3 sm:px-3 font-black text-white focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => establecerHoraActual(setHoraTermino)}
                        className="px-2 bg-slate-850 border-2 border-slate-750 rounded-xl text-[10px] font-bold text-slate-400 active:scale-95 cursor-pointer"
                      >
                        Ahora
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feedback */}
                {errorMsg && (
                  <div className="bg-red-950/45 border-2 border-red-500/30 text-red-200 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="bg-emerald-950/45 border-2 border-emerald-500/30 text-emerald-250 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Botón Guardar */}
                <div className="flex gap-2.5 mt-1 w-full">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.98] rounded-xl text-white text-sm sm:text-base font-black shadow-md shadow-indigo-600/10 cursor-pointer transition-all"
                  >
                    {registroAEditar ? 'Guardar Cambios' : `+ Añadir Tiempo`}
                  </button>
                  {registroAEditar && (
                    <button
                      type="button"
                      onClick={handleCancelarEdicion}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] rounded-xl text-slate-350 text-sm font-black border border-slate-700/50 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

              </form>

              {/* Lista de segmentos */}
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-850/80 h-full flex flex-col gap-2.5">
                <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-1.5">
                  Tiempos Registrados Hoy ({registrosPlaca.length}):
                </h4>
                
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[180px] pr-1">
                  {registrosPlaca.length > 0 ? (
                    registrosPlaca.map((segmento) => {
                      const cond = todosLosConductores.find(c => c.id === segmento.conductor_id) || { nombre: segmento.conductor_id, codigo: '?' };
                      const esEmmsa = segmento.fase === 'emmsa';
                      
                      return (
                        <div 
                          key={segmento.id}
                          className={`flex items-center justify-between p-2.5 border rounded-xl text-[11px] sm:text-xs font-bold ${
                            esEmmsa 
                              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                              : 'bg-orange-950/20 border-orange-500/20 text-orange-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full block bg-current"></span>
                            <span className="text-slate-100 font-extrabold text-xs sm:text-sm">
                              {segmento.hora_inicio} - {segmento.hora_termino}
                            </span>
                            <span className="text-slate-650">|</span>
                            <span className="text-slate-300 truncate max-w-[100px] sm:max-w-none">{cond.nombre}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleEliminarSegmento(segmento.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Eliminar tiempo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-slate-600 italic text-center py-6">
                      Sin tiempos registrados hoy.
                    </p>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Botón Volver al Tablero */}
          <button
            onClick={() => setPaso(3)}
            className="w-full mt-auto py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs sm:text-sm font-bold border-t border-slate-750/50 cursor-pointer rounded-xl"
          >
            ← Volver al Listado de Placas
          </button>
        </div>
      )}

    </div>
  );
}
