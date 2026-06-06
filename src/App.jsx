import React, { useState, useEffect } from 'react';
import { 
  getRecords, 
  getDrivers, 
  saveRecord, 
  subscribeToDB,
  getActiveDriversForDate,
  getMinutesFromTime,
  formatMinutesToTime,
  PLACAS_PRECONFIGURADAS
} from './services/db';
import SupervisorForm from './components/SupervisorForm';
import GanttChart from './components/GanttChart';
import { 
  Truck, 
  Calendar, 
  BarChart3, 
  ClipboardEdit, 
  RefreshCw,
  Database,
  Menu,
  X,
  Users,
  Timer
} from 'lucide-react';

const obtenerTurnoActual = () => {
  const hora = new Date().getHours();
  if (hora >= 6 && hora < 14) return 'Mañana';
  if (hora >= 14 && hora < 22) return 'Tarde';
  return 'Noche';
};

export default function App() {
  const hoyStr = new Date().toISOString().split('T')[0];
  
  // Estados principales
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);
  const [turnoActivo] = useState(obtenerTurnoActual());
  const [registros, setRegistros] = useState([]);
  const [placaAEditar, setPlacaAEditar] = useState('');
  const [pasoForm, setPasoForm] = useState(1);
  const [registroAEditar, setRegistroAEditar] = useState(null);
  const [conductoresHoy, setConductoresHoy] = useState([]);
  
  // Navegación de vistas: 'analisis' o 'registro'
  const [vistaActiva, setVistaActiva] = useState('registro');
  
  // Mobile drawer
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  // Cargar datos operativos de la fecha
  const cargarDatos = async () => {
    try {
      const data = await getRecords(fechaSeleccionada);
      setRegistros(data);
      const activos = await getActiveDriversForDate(fechaSeleccionada);
      setConductoresHoy(activos);
    } catch (error) {
      console.error('Error al cargar datos operativos:', error);
    }
  };


  // Suscribirse a cambios en LocalStorage (simulado de tiempo real)
  useEffect(() => {
    cargarDatos();
    const unsubscribe = subscribeToDB(() => {
      cargarDatos();
    });
    return () => unsubscribe();
  }, [fechaSeleccionada]);

  // Seeding inicial de demostración para que la interfaz se vea viva
  // El sistema inicia completamente vacío para el uso del supervisor.


  const limpiarDatosParaDemostracion = () => {
    if (window.confirm('¿Deseas restablecer los datos locales a su estado inicial de fábrica?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Contenido común de la barra lateral (Sidebar)
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between p-5 text-slate-300">
      
      {/* Parte Superior: Marca y Navegación */}
      <div className="flex flex-col gap-6">
        
        {/* Branding */}
        <div className="bg-white px-4 py-3 rounded-2xl shadow-md border border-slate-200 flex items-center justify-center">
          <img src="/logo.png" alt="petroaseo" className="h-7 w-auto object-contain" />
        </div>

        <div className="h-px bg-slate-800/80 my-1" />

        {/* Enlaces de Navegación */}
        <nav className="flex flex-col gap-2">
          
          <button
            onClick={() => {
              setVistaActiva('registro');
              setRegistroAEditar(null);
              setMenuMovilAbierto(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              vistaActiva === 'registro'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardEdit className="w-5 h-5" />
            Registro Operativo
          </button>

          <button
            onClick={() => {
              setVistaActiva('analisis');
              setMenuMovilAbierto(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              vistaActiva === 'analisis'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Análisis y Monitoreo
          </button>

        </nav>
      </div>
    </div>
  );

  // 1. Calcular horas de conductores registrados
  const reporteConductores = conductoresHoy.map(cond => {
    const recordsCond = registros.filter(r => r.conductor_id === cond.id);
    let totalMinutos = 0;
    recordsCond.forEach(r => {
      const start = getMinutesFromTime(r.hora_inicio);
      const end = getMinutesFromTime(r.hora_termino);
      if (end > start) {
        totalMinutos += (end - start);
      }
    });
    return {
      ...cond,
      totalMinutos,
      viajes: recordsCond.length
    };
  }).sort((a, b) => b.totalMinutos - a.totalMinutos);

  const formatearDuracion = (minutos) => {
    if (minutos <= 0) return '0h';
    const hrs = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  // 2. Calcular horas muertas por placa (Brechas en EMMSA > 30 min)
  const reporteHorasMuertas = PLACAS_PRECONFIGURADAS.map(placa => {
    const recordsPlaca = registros.filter(r => r.placa === placa);
    const sortedRecords = [...recordsPlaca].sort((a, b) => {
      return getMinutesFromTime(a.hora_inicio) - getMinutesFromTime(b.hora_inicio);
    });

    const brechas = [];
    let totalMinutosMuertos = 0;

    for (let i = 0; i < sortedRecords.length - 1; i++) {
      const preceding = sortedRecords[i];
      const succeeding = sortedRecords[i+1];

      // La hora muerta ocurre solo si termina EMMSA (fase === 'emmsa') y luego sale a viaje (fase === 'viaje')
      if (preceding.fase === 'emmsa' && succeeding.fase === 'viaje') {
        const finActual = getMinutesFromTime(preceding.hora_termino);
        const inicioSiguiente = getMinutesFromTime(succeeding.hora_inicio);

        if (inicioSiguiente > finActual) {
          const diff = inicioSiguiente - finActual;
          if (diff > 30) {
            brechas.push({
              desde: preceding.hora_termino,
              hasta: succeeding.hora_inicio,
              duracion: diff
            });
            totalMinutosMuertos += diff;
          }
        }
      }
    }

    return {
      placa,
      brechas,
      totalMinutosMuertos,
      totalSegmentos: recordsPlaca.length
    };
  }).filter(item => item.totalSegmentos > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased">
      
      {/* NAVEGACIÓN LATERAL PARA PANTALLAS GRANDES */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-850 shrink-0 h-screen sticky top-0">
        {renderSidebarContent()}
      </aside>

      {/* CABECERA PARA PANTALLAS MÓVILES */}
      <header className="lg:hidden glass-panel border-b border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        
        {/* Marca */}
        <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
          <img src="/logo.png" alt="petroaseo" className="h-6 w-auto object-contain" />
        </div>

        {/* Título de Vista Activa */}
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-lg">
          {vistaActiva === 'analisis' ? 'Análisis' : 'Registro'}
        </div>

        {/* Botón de Menú (Hamburger) */}
        <button 
          onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
          className="p-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-350 hover:bg-slate-800 cursor-pointer"
        >
          {menuMovilAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

      </header>

      {/* MENÚ MÓVIL (SLIDING DRAWER) */}
      {menuMovilAbierto && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMenuMovilAbierto(false)}
          />
          {/* Panel */}
          <div className="relative w-64 bg-slate-900 h-full flex flex-col border-r border-slate-800 animate-slide-in shadow-2xl">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* VISTA 1: ANÁLISIS Y MONITOREO */}
        {vistaActiva === 'analisis' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Gráfica Gantt en la parte superior (Full ancho) */}
            <div className="w-full">
              <GanttChart 
                date={fechaSeleccionada}
                records={registros}
                onEditRecord={(record) => {
                  setRegistroAEditar(record);
                  setPlacaAEditar(record.placa);
                  setPasoForm(4);
                  setVistaActiva('registro');
                }}
                onDeleteRecord={cargarDatos}
                onDateChange={setFechaSeleccionada}
                onGoToRegister={() => setVistaActiva('registro')}
              />
            </div>
            
            {/* Cuadros Analíticos Inferiores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-2">
              
              {/* Tabla 1: Horas Trabajadas por Conductor */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Rendimiento de Conductores</h3>
                    <p className="text-xs text-slate-400 font-medium">Horas de conducción acumuladas hoy</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 pl-1">Conductor</th>
                        <th className="py-2.5">Código</th>
                        <th className="py-2.5 text-center">Registros / Viajes</th>
                        <th className="py-2.5 text-right pr-1">Total Trabajado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 font-bold text-slate-300">
                      {reporteConductores.length > 0 ? (
                        reporteConductores.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-850/40 transition-colors">
                            <td className="py-3 pl-1 text-slate-100 font-extrabold">{c.nombre}</td>
                            <td className="py-3">
                              <span className="bg-slate-950 border border-slate-800 text-indigo-300 px-2 py-0.5 rounded font-black text-[10px]">
                                {c.codigo}
                              </span>
                            </td>
                            <td className="py-3 text-center">{c.viajes}</td>
                            <td className="py-3 text-right pr-1 font-black text-slate-100 text-sm">
                              {formatearDuracion(c.totalMinutos)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-slate-500 italic">
                            Sin conductores registrados hoy.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabla 2: Horas Muertas por Placa */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Horas Muertas por Unidad</h3>
                    <p className="text-xs text-slate-400 font-medium">Inactividad en EMMSA superior a 30 minutos</p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 pl-1">Placa</th>
                        <th className="py-2.5 text-center">Nº Brechas</th>
                        <th className="py-2.5">Detalle de Intervalos</th>
                        <th className="py-2.5 text-right pr-1">Total Muerto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 font-bold text-slate-300">
                      {reporteHorasMuertas.length > 0 ? (
                        reporteHorasMuertas.map((h) => (
                          <tr key={h.placa} className="hover:bg-slate-850/40 transition-colors">
                            <td className="py-3 pl-1 text-slate-100 font-extrabold text-sm">{h.placa}</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                h.brechas.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-950 text-slate-500'
                              }`}>
                                {h.brechas.length}
                              </span>
                            </td>
                            <td className="py-3 text-slate-400 text-[11px] leading-relaxed">
                              {h.brechas.length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  {h.brechas.map((b, idx) => (
                                    <span key={idx}>
                                      • {b.desde} - {b.hasta} ({formatearDuracion(b.duracion)})
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-emerald-500/80 font-semibold">Uso óptimo (Sin brechas &gt; 30m)</span>
                              )}
                            </td>
                            <td className="py-3 text-right pr-1 font-black text-slate-100 text-sm">
                              {h.totalMinutosMuertos > 0 ? (
                                <span className="text-amber-400">{formatearDuracion(h.totalMinutosMuertos)}</span>
                              ) : (
                                <span className="text-slate-550 font-semibold">0h</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-slate-500 italic">
                            Sin vehículos operativos hoy.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* VISTA 2: REGISTRO OPERATIVO (LLENADO) */}
        {vistaActiva === 'registro' && (
          <div className="w-full animate-fade-in">
            <SupervisorForm 
              selectedDate={fechaSeleccionada}
              onDateChange={setFechaSeleccionada}
              onRecordSaved={() => {
                cargarDatos(); // Solo recargar datos, mantener al usuario en el formulario de la placa
                setRegistroAEditar(null);
              }}
              initialPlaca={placaAEditar}
              onPlacaChange={setPlacaAEditar}
              initialPaso={pasoForm}
              onPasoChange={setPasoForm}
              registroAEditar={registroAEditar}
              onCancelEdit={() => setRegistroAEditar(null)}
              records={registros}
            />
          </div>
        )}

      </main>

    </div>
  );
}
