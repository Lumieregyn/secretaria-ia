import React from 'react';

export default function Painel() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Painel Secretaria IA</h1>
      <form className="space-y-4">
        <div>
          <label className="block mb-1">Nome do Representante</label>
          <input className="border rounded p-2 w-full" />
        </div>
        <div>
          <label className="block mb-1">Telefone</label>
          <input className="border rounded p-2 w-full" />
        </div>
        <div>
          <label className="block mb-1">Marcas Representadas</label>
          <input className="border rounded p-2 w-full" />
        </div>
        <div>
          <label className="block mb-1">Frequência de Disparo</label>
          <select className="border rounded p-2 w-full">
            <option>Diário</option>
            <option>Semanal</option>
            <option>Mensal</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Mensagem</label>
          <textarea className="border rounded p-2 w-full" rows="4"></textarea>
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Salvar
        </button>
      </form>
    </div>
  );
}
