import React, { useState, useEffect, useRef } from 'react';
import { getDrivers, deleteRecord, getMinutesFromTime, formatMinutesToTime } from '../services/db';
import { Clock, Edit2, Trash2, Calendar, ZoomIn, ZoomOut } from 'lucide-react';


const HORAS_EJE_X = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00'
];

export default function GanttChart({ date, records, onEditRecord, onDeleteRecord, onDateChange, onGoToRegister }) {
  const [conductores, setConductores] = useState([]);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [nowPercent, setNowPercent] = useState(-1);
  const chartContainerRef = useRef(null);

  useEffect(() => {
    const cargarConductores = async () => {
      const data = await getDrivers();
      setConductores(data);
    };
    cargarConductores();
  }, [records]);




  // Indicador de hora actual en tiempo real para el día de hoy
  useEffect(() => {
    const updateTimeIndicator = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      if (date !== todayStr) {
        setNowPercent(-1);
        return;
      }
      
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      let minutesSinceStart = 0;
      if (hour < 6) {
        minutesSinceStart = (hour + 18) * 60 + minute;
      } else {
        minutesSinceStart = (hour - 6) * 60 + minute;
      }

      const percent = (minutesSinceStart / 1440) * 100;
      setNowPercent(percent >= 0 && percent <= 100 ? percent : -1);
    };

    updateTimeIndicator();
    const interval = setInterval(updateTimeIndicator, 60000);
    return () => clearInterval(interval);
  }, [date]);

  const getConductorInfo = (cId) => {
    return conductores.find(c => c.id === cId) || { nombre: 'Desconocido', codigo: '?' };
  };

  const placasGantt = [
    'BWR-724', 'BWP-886', 'BWQ-764', 'BWP-917', 'BWQ-863', 
    'BZV-711', 'BZV-736', 'BZU-913', 'CBJ-823'
  ];

  // RENDERIZAR VISTA VACÍA SI NO HAY REGISTROS
  if (records.length === 0) {
    return (
      <div className="bg-slate-900 p-8 rounded-2xl border-2 border-slate-800 shadow-xl flex flex-col items-center justify-center text-center gap-5 min-h-[350px] animate-fade-in">
        
        {/* Cabecera interna con selector de fecha */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Clock className="text-indigo-400 w-7 h-7 animate-pulse" />
            <h2 className="text-xl font-black text-white">Movimiento de Compactas</h2>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 shadow-inner">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input 
              type="date"
              value={date}
              onChange={(e) => onDateChange && onDateChange(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Icono de Calendario Vacío */}
        <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border-2 border-slate-800 mt-6 shadow-inner">
          <Calendar className="text-slate-600 w-8 h-8" />
        </div>
        
        <div>
          <h3 className="text-xl font-black text-white">No hay datos para analizar</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            No se han registrado movimientos de compactas para el día operativo <span className="text-slate-200 font-bold">{date}</span>.
          </p>
        </div>

        <button
          onClick={onGoToRegister}
          className="px-6 py-3 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/10 mb-4"
        >
          + Registrar Compactas para este día
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border-2 border-slate-800 shadow-xl flex flex-col gap-6 overflow-hidden relative">
      
      {/* Cabecera y Leyenda con Selector de Fecha integrado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Clock className="text-indigo-400 w-7 h-7 animate-pulse" />
              Movimiento de Compactas (Gantt)
            </h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              Visualización interactiva de tiempos en EMMSA y viajes al Relleno.
            </p>
          </div>
          
          {/* Selector de fecha global en el gráfico */}
          <div className="flex items-center gap-2 bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 shadow-inner">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input 
              type="date"
              value={date}
              onChange={(e) => onDateChange && onDateChange(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-400 block"></span>
            <span className="font-bold text-slate-350">Carga EMMSA (Verde)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-orange-500 border border-orange-400 block"></span>
            <span className="font-bold text-slate-350">Viaje Relleno (Naranja)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-500 block"></span>
            <span className="font-bold text-slate-350">Inoperativo (Rojo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500/10 border border-dashed border-emerald-500/30 block"></span>
            <span className="font-bold text-slate-400">Disponible (Verde Leve)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-500/10 border border-dashed border-amber-500/30 block"></span>
            <span className="font-bold text-amber-400">Tiempo Muerto (Ámbar Leve)</span>
          </div>
          {nowPercent >= 0 && (
            <div className="flex items-center gap-1.5 text-rose-400 font-bold border-l border-slate-800 pl-3">
              <span className="w-1.5 h-3 bg-rose-500 block animate-pulse"></span>
              <span>Hora Actual</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor del Gantt (min-w-1600px para dar más espacio a las horas) */}
      <div 
        ref={chartContainerRef}
        className="overflow-x-auto min-w-full pb-4"
      >
        <div 
          className="relative pr-2 transition-all duration-300"
          style={{ minWidth: '1600px' }}
        >
          
          {/* EJE X */}
          <div className="flex border-b border-slate-800 pb-2.5 mb-3 select-none">
            {/* Header de Eje Y (Pegajoso) */}
            <div className="w-24 shrink-0 text-slate-500 text-xs font-black uppercase tracking-wider pl-3 sticky left-0 bg-slate-900 z-30 border-r border-slate-800/80 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]">
              Vehículo
            </div>
            
            <div className="flex-1 relative flex justify-between pr-4">
              {HORAS_EJE_X.map((hora) => {
                const hourNum = parseInt(hora.split(':')[0]);
                let percent = 0;
                if (hourNum < 6) {
                  percent = ((hourNum + 18) / 24) * 100;
                } else {
                  percent = ((hourNum - 6) / 24) * 100;
                }
                return (
                  <div 
                    key={hora} 
                    className="absolute text-[11px] font-black text-slate-400 -translate-x-1/2"
                    style={{ left: `${percent}%` }}
                  >
                    {hora}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CUERPO DE FILAS */}
          <div className="flex flex-col gap-2.5 relative">
            
            {/* LÍNEA DE HORA ACTUAL */}
            {nowPercent >= 0 && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
                style={{ left: `calc(6rem + ${nowPercent}% * (100% - 6rem) / 100)` }}
              >
                <div className="absolute top-0 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
              </div>
            )}

            {placasGantt.map((placa) => {
              const vehiculoRecords = records.filter(r => r.placa === placa);

              // 1. Obtener y estructurar todos los bloques activos (Verde y Naranja)
              const activeBlocks = [];
              vehiculoRecords.forEach((record) => {
                const conductor = getConductorInfo(record.conductor_id);
                if (record.fase === 'emmsa') {
                  activeBlocks.push({
                    id: `${record.id}-emmsa`,
                    start: getMinutesFromTime(record.hora_inicio),
                    end: getMinutesFromTime(record.hora_termino),
                    type: 'EMMSA',
                    color: 'bg-emerald-500/90 border-emerald-450 shadow-emerald-500/10 text-white',
                    label: `🟢 ${conductor.nombre}`,
                    times: `${record.hora_inicio} - ${record.hora_termino}`,
                    record,
                    active: true
                  });
                }
                if (record.fase === 'viaje') {
                  activeBlocks.push({
                    id: `${record.id}-viaje`,
                    start: getMinutesFromTime(record.hora_inicio),
                    end: getMinutesFromTime(record.hora_termino),
                    type: 'Viaje Relleno',
                    color: 'bg-orange-500/90 border-orange-450 shadow-orange-500/10 text-white',
                    label: `🟠 ${conductor.nombre}`,
                    times: `${record.hora_inicio} - ${record.hora_termino}`,
                    record,
                    active: true
                  });
                }
                if (record.fase === 'inoperativo') {
                  activeBlocks.push({
                    id: `${record.id}-inoperativo`,
                    start: getMinutesFromTime(record.hora_inicio),
                    end: getMinutesFromTime(record.hora_termino),
                    type: 'Inoperativo',
                    color: 'bg-rose-600/95 border-rose-500 shadow-rose-600/10 text-white',
                    label: `🔴 Inop. ${conductor.nombre}`,
                    times: `${record.hora_inicio} - ${record.hora_termino}`,
                    record,
                    active: true
                  });
                }
              });

              // Ordenar bloques activos por hora de inicio
              activeBlocks.sort((a, b) => a.start - b.start);

              // 2. Calcular los bloques de "Disponible" y "Tiempo Muerto" en los espacios vacíos
              const allBlocks = [];
              let currentTime = 0; // Representa las 06:00 AM del inicio

              activeBlocks.forEach((block, idx) => {
                // Si hay un espacio disponible antes del bloque actual
                if (block.start > currentTime) {
                  const preceding = idx > 0 ? activeBlocks[idx - 1] : null;
                  const isDeadTime = preceding && 
                                     preceding.type === 'EMMSA' && 
                                     block.type === 'Viaje Relleno' && 
                                     (block.start - preceding.end) > 30;

                  if (isDeadTime) {
                    allBlocks.push({
                      id: `dead-${placa}-${currentTime}-${block.start}`,
                      start: currentTime,
                      end: block.start,
                      type: 'Tiempo Muerto',
                      color: 'bg-amber-500/10 border-2 border-dashed border-amber-500/25 text-amber-450/70 hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-350/85 transition-colors',
                      label: 'Tiempo Muerto',
                      times: `${formatMinutesToTime(currentTime)} - ${formatMinutesToTime(block.start)}`,
                      active: false
                    });
                  } else {
                    allBlocks.push({
                      id: `disponible-${placa}-${currentTime}-${block.start}`,
                      start: currentTime,
                      end: block.start,
                      type: 'Disponible',
                      color: 'bg-emerald-500/10 border-2 border-dashed border-emerald-500/25 text-emerald-450/60 hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-300/80 transition-colors',
                      label: 'Disponible',
                      times: `${formatMinutesToTime(currentTime)} - ${formatMinutesToTime(block.start)}`,
                      active: false
                    });
                  }
                }
                
                // Agregar el bloque activo
                allBlocks.push(block);
                
                // Avanzar el cursor de tiempo al término de este bloque
                currentTime = Math.max(currentTime, block.end);
              });

              // Si queda espacio al final de la jornada (hasta las 05:00 del día siguiente / 1440 min)
              // Al regresar a EMMSA el carro se considera DISPONIBLE, no muerto.
              if (currentTime < 1440) {
                allBlocks.push({
                  id: `disponible-${placa}-${currentTime}-1440`,
                  start: currentTime,
                  end: 1440,
                  type: 'Disponible',
                  color: 'bg-emerald-500/10 border-2 border-dashed border-emerald-500/25 text-emerald-450/60 hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-300/80 transition-colors',
                  label: 'Disponible',
                  times: `${formatMinutesToTime(currentTime)} - 05:00`,
                  active: false
                });
              }

              return (
                <div key={placa} className="flex items-center h-14 group/row animate-fade-in">
                  {/* Eje Y (Pegajoso) */}
                  <div className="w-24 shrink-0 flex flex-col justify-center pl-3 sticky left-0 bg-slate-900 z-20 border-r border-slate-800/80 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] h-full">
                    <span className="text-base font-black text-slate-100 group-hover/row:text-indigo-400 transition-colors leading-tight">
                      {placa}
                    </span>
                    <span className="text-[9px] text-slate-550 font-bold leading-none mt-0.5">
                      {vehiculoRecords.length === 1 ? '1 registro' : `${vehiculoRecords.length} registros`}
                    </span>
                  </div>

                  {/* Fila del Gráfico */}
                  <div className="flex-1 h-full bg-slate-950/70 border-2 border-slate-800/60 rounded-xl relative overflow-hidden shadow-inner">
                    
                    {/* Cuadrícula vertical de 24 líneas (Alineadas exactamente con cada hora) */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.12] z-0">
                      {Array.from({ length: 24 }).map((_, i) => {
                        const percent = (i / 24) * 100;
                        return (
                          <div 
                            key={i} 
                            className="absolute top-0 bottom-0 border-r border-dashed border-slate-700 h-full"
                            style={{ left: `${percent}%` }}
                          />
                        );
                      })}
                    </div>

                    {/* RENDERIZAR BLOQUES */}
                    {allBlocks.map((b) => {
                      const leftPercent = (b.start / 1440) * 100;
                      let widthPercent = ((b.end - b.start) / 1440) * 100;
                      if (widthPercent <= 0) widthPercent = 2.5;
                      // Calcular ancho real en píxeles (basado en el ancho mínimo estático de 1600px)
                      const blockWidthPx = (widthPercent / 100) * 1600;
                      // Mostrar texto si el bloque mide más de 45px reales
                      const mostrarTexto = b.active ? blockWidthPx > 45 : blockWidthPx > 85;

                      return (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (b.active) {
                              setActiveTooltip(b.record);
                            }
                          }}
                          className={`absolute top-2 bottom-2 rounded-lg px-2 py-1 flex items-center justify-between transition-all z-10 overflow-hidden ${
                            b.active
                              ? 'border-2 cursor-pointer hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] shadow-md shadow-black/25'
                              : 'cursor-help active:scale-[0.99]'
                          } ${b.color}`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            minWidth: b.active ? '36px' : '0px'
                          }}
                          title={
                            b.active 
                              ? `Conductor ${getConductorInfo(b.record.conductor_id).nombre} (${b.type}): ${b.times}${b.record.observaciones ? ` - Obs: ${b.record.observaciones}` : ''}` 
                              : b.type === 'Tiempo Muerto'
                                ? `Tiempo Muerto en EMMSA: ${b.times} (Excede 30 min)`
                                : `Disponible en EMMSA: ${b.times}`
                          }
                        >
                          <span className={`text-[10px] font-black tracking-wider flex items-center gap-1 select-none truncate ${
                            b.active ? 'text-white' : 'text-current text-[9px] uppercase tracking-widest'
                          }`}>
                            {mostrarTexto ? b.label : ''}
                          </span>
                          
                          {b.active && mostrarTexto && (
                            <span className="text-[9px] font-black opacity-90 hidden sm:inline truncate pl-1">
                              {b.times}
                            </span>
                          )}

                          {/* Puntito indicador de Observaciones */}
                          {b.active && b.record && b.record.observaciones && (
                            <span 
                              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white border border-slate-900 shadow-sm z-20"
                              title={`Observación: ${b.record.observaciones}`}
                            />
                          )}
                        </div>
                      );
                    })}

                  </div>
                </div>
              );
            })}

          </div>

        </div>
      </div>

      {/* MODAL DETALLADO DE TRIP / TOOLTIP */}
      {activeTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setActiveTooltip(null)}>
          <div 
            className="bg-slate-900 border-2 border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-black bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-indigo-400">
                  Vehículo: {activeTooltip.placa}
                </span>
                <h3 className="text-xl font-black text-white mt-3 flex items-center gap-2">
                  {getConductorInfo(activeTooltip.conductor_id).nombre}
                  <span className="text-xs font-extrabold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    Cód: {getConductorInfo(activeTooltip.conductor_id).codigo}
                  </span>
                </h3>
              </div>
              <span className="text-xs font-black bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-xl">
                Turno {activeTooltip.turno}
              </span>
            </div>

            {/* Grid de Tiempos y Datos */}
            <div className="grid grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-850 text-xs font-bold">
              <div>
                <p className="text-slate-550 uppercase tracking-wider mb-0.5">Supervisor</p>
                <p className="text-base text-slate-200">{activeTooltip.supervisor}</p>
              </div>
              <div>
                <p className="text-slate-550 uppercase tracking-wider mb-0.5">Fecha Operación</p>
                <p className="text-base text-slate-200">{activeTooltip.fecha}</p>
              </div>

              <div className="col-span-2 border-t border-slate-850 pt-2.5">
                <p className={`font-extrabold flex items-center gap-1.5 mb-1.5 uppercase tracking-wider ${
                  activeTooltip.fase === 'emmsa' ? 'text-emerald-400' : activeTooltip.fase === 'viaje' ? 'text-orange-400' : 'text-rose-400'
                }`}>
                  {activeTooltip.fase === 'emmsa' 
                    ? '🟢 Trabajo en EMMSA' 
                    : activeTooltip.fase === 'viaje' 
                      ? '🟠 Viaje al Relleno / Petramás' 
                      : '🔴 Vehículo Inoperativo'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-slate-550 mb-0.5">Hora Inicio</p>
                    <p className="text-sm text-slate-200">{activeTooltip.hora_inicio}</p>
                  </div>
                  <div>
                    <p className="text-slate-550 mb-0.5">Hora Término</p>
                    <p className="text-sm text-slate-200">{activeTooltip.hora_termino}</p>
                  </div>
                </div>
              </div>

              {(activeTooltip.ticket_ingreso || activeTooltip.ticket_salida || activeTooltip.peso_emmsa || activeTooltip.peso_petramas) && (
                <div className="col-span-2 border-t border-slate-850 pt-2.5 grid grid-cols-2 gap-y-2">
                  {activeTooltip.ticket_ingreso && (
                    <div>
                      <p className="text-slate-550 mb-0.5">Tkt Ingreso</p>
                      <p className="text-slate-200">{activeTooltip.ticket_ingreso}</p>
                    </div>
                  )}
                  {activeTooltip.ticket_salida && (
                    <div>
                      <p className="text-slate-550 mb-0.5">Tkt Salida</p>
                      <p className="text-slate-200">{activeTooltip.ticket_salida}</p>
                    </div>
                  )}
                  {activeTooltip.peso_emmsa && (
                    <div>
                      <p className="text-slate-550 mb-0.5">Peso EMMSA</p>
                      <p className="text-slate-200">{activeTooltip.peso_emmsa} Kg</p>
                    </div>
                  )}
                  {activeTooltip.peso_petramas && (
                    <div>
                      <p className="text-slate-550 mb-0.5">Peso Petramás</p>
                      <p className="text-slate-200">{activeTooltip.peso_petramas} Kg</p>
                    </div>
                  )}
                </div>
              )}

              {activeTooltip.observaciones && (
                <div className="col-span-2 border-t border-slate-850 pt-2.5">
                  <p className="text-slate-550 mb-0.5 uppercase tracking-wider">Observaciones</p>
                  <p className="text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-850 font-medium whitespace-pre-wrap">{activeTooltip.observaciones}</p>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
              <button
                onClick={() => setActiveTooltip(null)}
                className="px-5 py-2.5 border-2 border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onEditRecord(activeTooltip);
                    setActiveTooltip(null);
                  }}
                  className="px-4 py-2.5 bg-indigo-600/20 border-2 border-indigo-500/30 hover:bg-indigo-600/30 rounded-xl text-xs font-bold text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
                      await deleteRecord(activeTooltip.id);
                      if (onDeleteRecord) onDeleteRecord();
                      setActiveTooltip(null);
                    }
                  }}
                  className="px-4 py-2.5 bg-red-600/20 border-2 border-red-500/30 hover:bg-red-600/30 rounded-xl text-xs font-bold text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
