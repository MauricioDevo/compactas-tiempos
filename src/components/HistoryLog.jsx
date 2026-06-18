import React, { useState, useEffect } from 'react';
import { getHistory, subscribeToDB } from '../services/db';
import { Search, Calendar, User, Database, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function HistoryLog() {
  const [historyItems, setHistoryItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const ITEMS_PER_PAGE = 30;

  const cargarHistorial = async () => {
    setLoading(true);
    const data = await getHistory();
    setHistoryItems(data);
    setLoading(false);
  };

  useEffect(() => {
    cargarHistorial();
    
    // Suscribirse a cambios en tiempo real
    const unsubscribe = subscribeToDB(() => {
      cargarHistorial();
    });
    return () => unsubscribe();
  }, []);

  // Filtrado defensivo
  const filteredItems = Array.isArray(historyItems) ? historyItems.filter((item) => {
    if (!item) return false;
    const term = searchTerm.trim().toLowerCase();
    
    const supervisor = item.supervisor ? String(item.supervisor).toLowerCase() : '';
    const conductor = item.conductor_nombre ? String(item.conductor_nombre).toLowerCase() : '';
    const placa = item.placa ? String(item.placa).toLowerCase() : '';

    // Filtro por término de búsqueda (Supervisor, Conductor, Placa)
    const matchesSearch = 
      term === '' ||
      supervisor.includes(term) ||
      conductor.includes(term) ||
      placa.includes(term);

    // Filtro por fecha de operación (fecha_registro)
    const matchesDate = filterDate === '' || item.fecha_registro === filterDate;

    return matchesSearch && matchesDate;
  }) : [];

  // Paginación
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  
  // Asegurar que la página actual esté en un rango válido si cambian los filtros
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredItems.length, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = Array.isArray(filteredItems) ? filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE) : [];

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const dateObj = new Date(isoString);
      // Formato DD/MM/AAAA HH:MM:SS
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = dateObj.getFullYear();
      const hr = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      const sec = String(dateObj.getSeconds()).padStart(2, '0');
      return `${d}/${m}/${y} ${hr}:${min}:${sec}`;
    } catch (e) {
      return isoString;
    }
  };

  const getActionBadge = (accion) => {
    switch (accion) {
      case 'CREAR':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 px-2.5 py-1 rounded-lg font-black text-[10px] tracking-wider uppercase inline-block shadow-sm">
            ➕ Crear
          </span>
        );
      case 'EDITAR':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-250 px-2.5 py-1 rounded-lg font-black text-[10px] tracking-wider uppercase inline-block shadow-sm">
            ✏️ Editar
          </span>
        );
      case 'ELIMINAR':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-250 px-2.5 py-1 rounded-lg font-black text-[10px] tracking-wider uppercase inline-block shadow-sm">
            ❌ Eliminar
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-black text-[10px] tracking-wider uppercase inline-block">
            {accion}
          </span>
        );
    }
  };

  const getFaseBadge = (fase) => {
    switch (fase) {
      case 'emmsa':
        return (
          <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
            🟢 EMMSA
          </span>
        );
      case 'viaje':
        return (
          <span className="bg-orange-500/10 text-orange-700 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
            🟠 Viaje
          </span>
        );
      case 'inoperativo':
        return (
          <span className="bg-rose-500/10 text-rose-700 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
            🔴 Inoperativo
          </span>
        );
      default:
        return (
          <span className="bg-slate-500/10 text-slate-700 border border-slate-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
            {fase}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 shadow-xl flex flex-col gap-5 animate-fade-in">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Database className="text-indigo-400 w-7 h-7" />
            Historial de Auditoría
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            Bitácora de movimientos creados, editados y eliminados por los supervisores.
          </p>
        </div>
        
        {/* Contador */}
        <div className="bg-slate-950/80 px-4 py-2 border-2 border-slate-800 rounded-xl text-center">
          <span className="text-xs font-black text-slate-400 uppercase block tracking-wider leading-none">Total Registros</span>
          <span className="text-2xl font-black text-indigo-400 leading-none">{totalItems}</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Buscador de texto */}
        <div className="md:col-span-2 relative flex items-center">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por placa, supervisor o conductor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Buscador de fecha */}
        <div className="relative flex items-center bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2.5">
          <Calendar className="w-4 h-4 text-indigo-400 absolute left-3.5 pointer-events-none" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filtrar fecha de jornada"
            className="w-full bg-transparent border-none text-xs font-bold text-slate-200 focus:outline-none cursor-pointer pl-6"
          />
          {filterDate && (
            <button
              onClick={() => {
                setFilterDate('');
                setCurrentPage(1);
              }}
              className="text-slate-500 hover:text-slate-350 text-[10px] font-black uppercase tracking-wider ml-1"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla del Historial */}
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold text-sm animate-pulse flex flex-col items-center justify-center gap-3">
            <Database className="w-8 h-8 text-indigo-400 animate-spin" />
            Cargando historial de auditoría...
          </div>
        ) : paginatedItems.length > 0 ? (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 pl-3">Fecha y Hora Acción</th>
                <th className="py-3">Supervisor</th>
                <th className="py-3">Acción</th>
                <th className="py-3 text-center">Unidad (Placa)</th>
                <th className="py-3">Conductor</th>
                <th className="py-3">Fase</th>
                <th className="py-3">Intervalo</th>
                <th className="py-3 text-center">Jornada</th>
                <th className="py-3 pr-3">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-bold text-slate-300">
              {paginatedItems.map((item) => (
                <tr key={item.id || Math.random().toString()} className="hover:bg-slate-850/40 transition-colors">
                  <td className="py-3.5 pl-3 text-slate-400 whitespace-nowrap">
                    {formatDateTime(item.fecha_accion)}
                  </td>
                  <td className="py-3.5 text-slate-100 font-extrabold whitespace-nowrap">
                    {item.supervisor || 'N/A'}
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    {getActionBadge(item.accion)}
                  </td>
                  <td className="py-3.5 text-center text-slate-100 font-black text-sm whitespace-nowrap">
                    {item.placa || 'N/A'}
                  </td>
                  <td className="py-3.5 text-slate-200 whitespace-nowrap">
                    {item.conductor_nombre || 'N/A'}
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    {getFaseBadge(item.fase)}
                  </td>
                  <td className="py-3.5 text-slate-200 font-extrabold whitespace-nowrap">
                    {(item.hora_inicio || '')} - {(item.hora_termino || '')}
                  </td>
                  <td className="py-3.5 text-center text-slate-400 whitespace-nowrap font-medium">
                    {item.fecha_registro || ''}
                  </td>
                  <td className="py-3.5 pr-3 max-w-[200px] truncate text-slate-400 font-medium italic" title={item.observaciones}>
                    {item.observaciones || <span className="text-slate-600 not-italic">Sin obs.</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-slate-500 italic border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            No se encontraron registros de auditoría en el historial para esta búsqueda.
          </div>
        )}
      </div>

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
          <span className="text-slate-400 text-xs font-bold">
            Mostrando registros <span className="text-slate-200 font-black">{startIndex + 1}</span> al{' '}
            <span className="text-slate-200 font-black">{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}</span> de{' '}
            <span className="text-slate-200 font-black">{totalItems}</span>
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-850 active:scale-95 disabled:opacity-40 disabled:pointer-events-none border-2 border-slate-800 text-slate-350 hover:text-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            
            <div className="hidden sm:flex items-center px-3 text-xs font-black text-slate-400 bg-slate-950 border-2 border-slate-800 rounded-xl">
              Página {currentPage} de {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-850 active:scale-95 disabled:opacity-40 disabled:pointer-events-none border-2 border-slate-800 text-slate-350 hover:text-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
