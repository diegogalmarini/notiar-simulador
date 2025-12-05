import React, { useState, useRef, useEffect } from 'react';
import { Folder, Image, FileText, Scale } from 'lucide-react';

const App = () => {
  // GLOBAL STATE
  const [activeNode, setActiveNode] = useState('DATOS'); // 'DATOS', 'IMAGENES', 'OBS', 'UIF'
  const [status, setStatus] = useState('Listo.');
  const [searchResults, setSearchResults] = useState([]);

  // FORM STATE
  const [formData, setFormData] = useState(getEmptyForm());
  const [editingId, setEditingId] = useState(null);

  // AUX
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState(null); // For Spouse Search

  function getEmptyForm() {
    return {
      tipo_persona: 'Fisica', sexo: '', apellido: '', variante: '', nombres: '',
      tipo_doc: 'DNI', nro_doc: '', cuit: '', nacionalidad: 'Argentina',
      fecha_nacimiento: '', lugar_nacimiento: '', profesion: '',
      calle: '', altura: '', piso: '', dpto: '', cp: '', localidad: '', provincia: 'Buenos Aires',
      email: '', telefono: '',
      nombre_padre: '', nombre_madre: '',
      estado_civil: 'Soltero', nupcias: '', id_conyuge: null, nombre_conyuge_visual: '',
      observaciones: ''
    };
  }

  // --- ACTIONS ---

  const handleSearch = () => {
    if (!searchTerm) return;
    setStatus('Buscando...');
    fetch(`http://localhost:3000/api/buscar-cliente?q=${searchTerm}`)
      .then(r => r.json())
      .then(data => {
        setSearchResults(data);
        setStatus(data.length ? `${data.length} encontrados.` : 'Sin resultados.');
      })
      .catch(() => setStatus('Error conexión.'));
  };

  const handleSelectClient = (client) => {
    setFormData(client);
    setEditingId(client.id);
    setSearchResults([]);
    setStatus(`Registro cargado: ${client.id}`);
  };

  const handleSave = () => {
    const url = editingId ? `http://localhost:3000/api/clientes/${editingId}` : 'http://localhost:3000/api/clientes';
    const method = editingId ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(r => r.json())
      .then(res => {
        if (res.error) {
          alert(res.error);
          setStatus('Error al guardar.');
        } else {
          alert("Registro Actualizado"); // STRICT REQUIREMENT RULE B
          setStatus("Registro Actualizado");

          // RULE B: DO NOT CLEAR FORM. Keep visible.
          if (!editingId && res.id) {
            setEditingId(res.id);
            // We keep formData exactly as is, so the inputs remain filled.
          }
        }
      })
      .catch(err => alert("Error de red"));
  };

  const handleNew = () => {
    setFormData(getEmptyForm());
    setEditingId(null);
    setStatus('Nuevo Registro.');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
  };

  // --- RENDER HELPERS ---
  const TreeItem = ({ label, icon, id }) => (
    <div
      onClick={() => setActiveNode(id)}
      className={`flex items-center gap-2 px-2 py-1 cursor-pointer border ${activeNode === id ? 'bg-[#000080] text-white border-dotted border-gray-200' : 'text-black border-transparent hover:bg-gray-100'}`}
    >
      {icon} <span className="text-[11px]">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-row h-screen bg-[#d4d0c8] text-[11px] font-tahoma select-none">

      {/* LEFT PANEL (SIDEBAR) - Fixed 200px */}
      <div className="w-[200px] flex flex-col border-r border-white shadow-[inset_-1px_-1px_0_#808080]">
        <div className="bg-white flex-1 border border-[#808080] m-1 p-1 overflow-auto inset-shadow">
          <TreeItem id="DATOS" label="Datos Personales" icon={<Folder size={14} className="fill-yellow-400 text-yellow-600" />} />
          <TreeItem id="IMAGENES" label="Imágenes" icon={<Image size={14} />} />
          <TreeItem id="OBS" label="Observaciones" icon={<FileText size={14} />} />
          <TreeItem id="UIF" label="Datos UIF" icon={<Scale size={14} />} />
        </div>
      </div>

      {/* RIGHT PANEL (CONTENT) */}
      <div className="flex-1 flex flex-col p-2 bg-[#ece9d8]">

        {/* TOOLBAR MOCK */}
        <div className="flex gap-1 mb-2 border-b border-gray-400 pb-1">
          <button onClick={handleNew} className="px-3 py-1 bg-[#ece9d8] border border-white shadow-[1px_1px_0_black] active:translate-y-px">Nuevo</button>
          <button onClick={handleSave} className="px-3 py-1 bg-[#ece9d8] border border-white shadow-[1px_1px_0_black] active:translate-y-px">Guardar</button>
          <div className="border-l border-gray-400 mx-1"></div>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="border border-[#7f9db9] px-1 w-40"
            placeholder="Buscar (Enter)"
          />
          <button onClick={handleSearch} className="px-2 bg-[#ece9d8] border border-white shadow-[1px_1px_0_black]">🔍</button>
        </div>

        {/* SEARCH RESULTS OVERLAY */}
        {searchResults.length > 0 && (
          <div className="absolute z-50 bg-white border border-black shadow-lg left-[220px] top-[80px] w-[500px] max-h-[300px] overflow-auto">
            <div className="bg-[#000080] text-white px-2 flex justify-between">
              <span>Resultados ({searchResults.length})</span>
              <button onClick={() => setSearchResults([])}>X</button>
            </div>
            <table className="w-full text-left">
              <thead><tr className="bg-gray-200"><th>Doc</th><th>Apellido</th><th>Nombres</th></tr></thead>
              <tbody>
                {searchResults.map(c => (
                  <tr key={c.id} onClick={() => handleSelectClient(c)} className="hover:bg-blue-100 cursor-pointer border-b">
                    <td>{c.nro_doc}</td><td>{c.apellido}</td><td>{c.nombres}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MAIN FORM AREA */}
        {activeNode === 'DATOS' && (
          <div className="grid grid-cols-12 gap-x-2 gap-y-1">

            {/* ROW 1: [Radio: Sexo] | [Input: Apellido (Grow)] | [Input: Variante (Small)] | [Input: Nombres (Grow)] */}
            <div className="col-span-2 flex items-center border border-gray-400 px-1 bg-white">
              <label className="mr-2"><input type="radio" name="sexo" value="M" checked={formData.sexo === 'M'} onChange={handleChange} tabIndex={1} /> M</label>
              <label><input type="radio" name="sexo" value="F" checked={formData.sexo === 'F'} onChange={handleChange} tabIndex={1} /> F</label>
            </div>
            <div className="col-span-4">
              <label className="block text-[#000080]">Apellido</label>
              <input name="apellido" value={formData.apellido} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={2} />
            </div>
            <div className="col-span-2">
              <label className="block text-[#000080]">Variante</label>
              <input name="variante" value={formData.variante} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={3} />
            </div>
            <div className="col-span-4">
              <label className="block text-[#000080]">Nombres</label>
              <input name="nombres" value={formData.nombres} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={4} />
            </div>

            {/* ROW 2: [Select: Tipo Doc] | [Input: Nro Doc] | [Input: CUIT] | [Input: Nacionalidad] */}
            <div className="col-span-2">
              <label className="block text-[#000080]">Tipo Doc</label>
              <select name="tipo_doc" value={formData.tipo_doc} onChange={handleChange} className="w-full border border-[#7f9db9]" tabIndex={5}>
                <option>DNI</option><option>LE</option><option>LC</option><option>PAS</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-[#000080]">Nro Doc</label>
              <input name="nro_doc" value={formData.nro_doc} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={6} />
            </div>
            <div className="col-span-3">
              <label className="block text-[#000080]">CUIT</label>
              <input name="cuit" value={formData.cuit} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={7} />
            </div>
            <div className="col-span-4">
              <label className="block text-[#000080]">Nacionalidad</label>
              <input name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={8} />
            </div>

            {/* ROW 3: [Input: Fecha Nac] | [Input: Lugar Nac] | [Input: Profesión] */}
            <div className="col-span-3">
              <label className="block text-[#000080]">Fecha Nac</label>
              <input name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" placeholder="YYYY-MM-DD" tabIndex={9} />
            </div>
            <div className="col-span-4">
              <label className="block text-[#000080]">Lugar Nac</label>
              <input name="lugar_nacimiento" value={formData.lugar_nacimiento} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={10} />
            </div>
            <div className="col-span-5">
              <label className="block text-[#000080]">Profesión</label>
              <input name="profesion" value={formData.profesion} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={11} />
            </div>

            <div className="col-span-12 h-px bg-gray-400 my-1"></div>

            {/* ROW 4 (Address): [Input: Calle] | [Input: Altura] | [Input: Piso] | [Input: Dpto] | [Input: CP] | [Input: Localidad] */}
            <div className="col-span-4">
              <label className="block text-[#000080]">Calle</label>
              <input name="calle" value={formData.calle} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={12} />
            </div>
            <div className="col-span-2">
              <label className="block text-[#000080]">Altura</label>
              <input name="altura" value={formData.altura} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={13} />
            </div>
            <div className="col-span-1">
              <label className="block text-[#000080]">Piso</label>
              <input name="piso" value={formData.piso} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={14} />
            </div>
            <div className="col-span-1">
              <label className="block text-[#000080]">Dpto</label>
              <input name="dpto" value={formData.dpto} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={15} />
            </div>
            <div className="col-span-1">
              <label className="block text-[#000080]">CP</label>
              <input name="cp" value={formData.cp} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={16} />
            </div>
            <div className="col-span-3">
              <label className="block text-[#000080]">Localidad</label>
              <input name="localidad" value={formData.localidad} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={17} />
            </div>

            <div className="col-span-12 h-px bg-gray-400 my-1"></div>

            {/* ROW 5: [Select: Estado Civil] | [Input: Nupcias] | [Input: Cónyuge (ReadOnly)] + [Button: Search (🔍)] */}
            <div className="col-span-3">
              <label className="block text-[#000080]">Estado Civil</label>
              <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} className="w-full border border-[#7f9db9]" tabIndex={18}>
                <option>Soltero</option><option>Casado</option><option>Divorciado</option><option>Viudo</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[#000080]">Nupcias</label>
              <input name="nupcias" value={formData.nupcias} onChange={handleChange} disabled={formData.estado_civil !== 'Casado'} className="w-full border border-[#7f9db9] px-1 disabled:bg-gray-100" tabIndex={19} />
            </div>
            <div className="col-span-7 flex items-end gap-1">
              <div className="flex-1">
                <label className="block text-[#000080]">Cónyuge</label>
                <input value={formData.nombre_conyuge_visual} readOnly className="w-full border border-[#7f9db9] px-1 bg-gray-100" />
              </div>
              <button className="px-2 border border-black shadow-[1px_1px_0_black] bg-[#ece9d8]" tabIndex={20}>🔍</button>
            </div>

            {/* ROW 6: [Input: Nombre Padre] | [Input: Nombre Madre] */}
            <div className="col-span-6">
              <label className="block text-[#000080]">Nombre Padre</label>
              <input name="nombre_padre" value={formData.nombre_padre} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={21} />
            </div>
            <div className="col-span-6">
              <label className="block text-[#000080]">Nombre Madre</label>
              <input name="nombre_madre" value={formData.nombre_madre} onChange={handleChange} className="w-full border border-[#7f9db9] px-1" tabIndex={22} />
            </div>

          </div>
        )}

        {/* STATUS BAR */}
        <div className="mt-auto border border-[#aca899] bg-white h-5 flex items-center px-1 text-gray-600">
          {status}
        </div>

      </div>
    </div>
  );
};

export default App;