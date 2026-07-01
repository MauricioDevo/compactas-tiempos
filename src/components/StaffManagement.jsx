import React, { useState, useEffect } from 'react';
import { getStaff, saveStaff } from '../services/db';
import { Users, ShieldAlert, CheckCircle2, Calculator } from 'lucide-react';

export default function StaffManagement({ date, onlyForm = false, onlySummary = false }) {
  const [totalConductores, setTotalConductores] = useState(0);
  const [descanceros, setDescanceros] = useState(0);
  const [descansosMedicos, setDescansosMedicos] = useState('');
  
  // Feedback
  const [success, setSuccess] = useState(false);

  // Cargar estadísticas del día cuando cambia la fecha
  useEffect(() => {
    const staff = getStaff(date);
    setTotalConductores(staff.total_conductores);
    setDescanceros(staff.descanceros);
    setDescansosMedicos(staff.conductores_descanso_medico.join(', '));
  }, [date]);

  const handleSave = (e) => {
    e.preventDefault();
    
    saveStaff(date, {
      total_conductores: totalConductores,
      descanceros: descanceros,
      conductores_descanso_medico: descansosMedicos
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  // Convertir descansos médicos a lista
  const listaDescansosMedicos = descansosMedicos
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);

  // Calcular el total general
  const totalGeneral = parseInt(totalConductores || 0) + 
                       parseInt(descanceros || 0) + 
                       listaDescansosMedicos.length;

  const renderForm = () => (
    <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Users className="text-indigo-400 w-5 h-5" />
          Registro de Asistencia del Personal
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Ingresa las cifras de personal para el día de operación seleccionado.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Total de Conductores (Activos)
            </label>
            <input
              type="number"
              min="0"
              value={totalConductores}
              onChange={(e) => setTotalConductores(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Descanceros (Franco / Descanso)
            </label>
            <input
              type="number"
              min="0"
              value={descanceros}
              onChange={(e) => setDescanceros(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Nombres en Descanso Médico (Separados por comas)
            </label>
            <textarea
              placeholder="Ej: Manuel Sanchez, Pedro Perez"
              value={descansosMedicos}
              onChange={(e) => setDescansosMedicos(e.target.value)}
              rows={2}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
          {success ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Personal actualizado
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">
              Los cambios se actualizarán en tiempo real en la gráfica y resumen.
            </span>
          )}
          <button
            type="submit"
            className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700/50 hover:border-slate-650 cursor-pointer"
          >
            Guardar Personal
          </button>
        </div>
      </form>
    </div>
  );

  const renderSummary = () => (
    <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden h-full">
      <div>
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Calculator className="text-indigo-400 w-5 h-5" />
          Resumen de Personal
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Cómputo general e incidencias médicas.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 py-2">
        <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3 text-center flex flex-col justify-center">
          <span className="text-xs text-slate-400 block mb-0.5">Activos</span>
          <span className="text-lg font-black text-indigo-400">{totalConductores}</span>
        </div>

        <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3 text-center flex flex-col justify-center">
          <span className="text-xs text-slate-400 block mb-0.5">Francos</span>
          <span className="text-lg font-black text-emerald-400">{descanceros}</span>
        </div>

        <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3 text-center flex flex-col justify-center">
          <span className="text-xs text-slate-400 block mb-0.5">Med. Rest</span>
          <span className="text-lg font-black text-rose-400">{listaDescansosMedicos.length}</span>
        </div>
      </div>

      <div className="bg-slate-950/30 border border-slate-800/50 rounded-xl p-3 flex-1 flex flex-col gap-1.5 min-h-[70px]">
        <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          Personal con Descanso Médico:
        </span>
        {listaDescansosMedicos.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-1 overflow-y-auto max-h-[80px] pr-1">
            {listaDescansosMedicos.map((nombre, i) => (
              <span 
                key={i} 
                className="text-[10px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full"
              >
                {nombre}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-600 text-xs italic mt-1 pl-1">
            Sin descansos reportados hoy.
          </span>
        )}
      </div>

      <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300">Total General:</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-100">{totalGeneral}</span>
          <span className="text-[10px] text-slate-500 font-bold uppercase">Pax</span>
        </div>
      </div>
    </div>
  );

  if (onlyForm) return renderForm();
  if (onlySummary) return renderSummary();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">{renderForm()}</div>
      <div>{renderSummary()}</div>
    </div>
  );
}
