import React, { useState, useEffect, useRef } from 'react';
import { Save, FilePlus, Printer, X, Search, AlertTriangle, List, UserPlus } from 'lucide-react';

// --- LISTA NEGRA UIF ---
const UIF_BLACKLIST = ['20-99999999-9', '20999999999'];

const App = () => {
  // --- ESTADO GLOBAL ---
  const [viewMode, setViewMode] = useState('SEARCH'); // 'SEARCH' | 'FORM'
  const [activeTab, setActiveTab] = useState('DATOS'); // 'DATOS' | 'CONTACTO' | 'FILIACION'
  const [statusMsg, setStatusMsg] = useState('Listo.');
  const [modal, setModal] = useState(null); // { type: 'ERROR'|'INFO'|'UIF'|'SPOUSE', title, msg }
  const [editingId, setEditingId] = useState(null);

  // --- ESTADO BUSCADOR (GATEKEEPER) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // --- ESTADO FORMULARIO ---
  const [formData, setFormData] = useState({
    // Identidad
    tipo_persona: 'Fisica', sexo: 'M', apellido: '', nombres: '',
    // Documento
    tipo_doc: 'DNI', nro_doc: '', nacionalidad: 'Argentina', fecha_nacimiento: '',
    // Contacto
    domicilio: '', localidad: '', cp: '', email: '', telefono: '',
    // Filiación
    nombre_padre: '', nombre_madre: '',
    // Civil
    estado_civil: 'SOLTERO', nupcias: '', id_conyuge: null, nombre_conyuge_visual: ''
  });

  const errorsRef = useRef({});

  // --- ESTADO MODAL CÓNYUGE ---
  const [spouseSearchTerm, setSpouseSearchTerm] = useState('');
  const [spouseResults, setSpouseResults] = useState([]);

  // --- LÓGICA DE BÚSQUEDA PRINCIPAL ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length > 0) {
        setIsSearching(true);
        setStatusMsg('Buscando en base de datos...');

        fetch(`http://localhost:3000/api/buscar-cliente?q=${searchTerm}`)
          .then(res => res.json())
          .then(results => {
            setSearchResults(results);
            setIsSearching(false);
            setHasSearched(true);
            setStatusMsg(results.length > 0 ? `${results.length} coincidencias.` : 'No encontrado. Puede crear nuevo.');
          })
          .catch(err => {
            console.error(err);
            setIsSearching(false);
            setStatusMsg('Error en búsqueda.');
          });
      } else {
        setSearchResults([]);
        setIsSearching(false);
        setHasSearched(false);
      }
    }, 800);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // --- LÓGICA DE BÚSQUEDA CÓNYUGE ---
  useEffect(() => {
    if (modal?.type !== 'SPOUSE') return;

    const delayDebounceFn = setTimeout(() => {
      if (spouseSearchTerm.length > 0) {
        fetch(`http://localhost:3000/api/buscar-cliente?q=${spouseSearchTerm}`)
          .then(res => res.json())
          .then(results => setSpouseResults(results))
          .catch(console.error);
      } else {
        setSpouseResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [spouseSearchTerm, modal]);

  // --- HANDLERS ---

  const handleNew = () => {
    setFormData({
      tipo_persona: 'Fisica', sexo: 'M', apellido: '', nombres: '',
      tipo_doc: 'DNI', nro_doc: '', nacionalidad: 'Argentina', fecha_nacimiento: '',
      domicilio: '', localidad: '', cp: '', email: '', telefono: '',
      nombre_padre: '', nombre_madre: '',
      estado_civil: 'SOLTERO', nupcias: '', id_conyuge: null, nombre_conyuge_visual: ''
    });
    errorsRef.current = {};
    setEditingId(null);
    setViewMode('FORM');
    setActiveTab('DATOS');
    setStatusMsg('Nuevo registro.');
  };

  const handleSelectClient = (client) => {
    console.log("Cargando cliente:", client);
    setEditingId(client.id);
    setFormData({
      tipo_persona: client.tipo_persona || 'Fisica',
      sexo: client.sexo || 'M',
      apellido: client.apellido || '',
      nombres: client.nombres || '',
      tipo_doc: client.tipo_doc || 'DNI',
      nro_doc: client.nro_doc || '',
      nacionalidad: client.nacionalidad || '',
      fecha_nacimiento: client.fecha_nacimiento || '',
      domicilio: client.domicilio || '',
      localidad: client.localidad || '',
      cp: client.cp || '',
      email: client.email || '',
      telefono: client.telefono || '',
      nombre_padre: client.nombre_padre || '',
      nombre_madre: client.nombre_madre || '',
      estado_civil: client.estado_civil || 'SOLTERO',
      nupcias: client.nupcias || '',
      id_conyuge: client.id_conyuge || null,
      nombre_conyuge_visual: client.nombre_conyuge_visual || ''
    });
    setViewMode('FORM');
    setActiveTab('DATOS');
    setStatusMsg('Registro cargado.');
  };

  const handleBackToSearch = () => {
    setViewMode('SEARCH');
    setStatusMsg('Listo.');
    setSearchTerm(''); // Opcional: limpiar búsqueda al volver
    setHasSearched(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    if (errorsRef.current[name]) delete errorsRef.current[name];

    // Resetear cónyuge si cambia estado civil a no casado
    if (name === 'estado_civil' && !['CASADO'].includes(value.toUpperCase())) {
      setFormData(prev => ({ ...prev, nupcias: '', id_conyuge: null, nombre_conyuge_visual: '' }));
    }
  };

  const handleSpouseSelect = (spouse) => {
    setFormData(prev => ({
      ...prev,
      id_conyuge: spouse.id,
      nombre_conyuge_visual: `${spouse.apellido}, ${spouse.nombres}`
    }));
    setModal(null);
  };

  const handleSave = async () => {
    // Validación Básica
    let newErrors = {};
    if (!formData.apellido) newErrors.apellido = true;
    if (!formData.nombres) newErrors.nombres = true;
    if (!formData.nro_doc) newErrors.nro_doc = true;
    if (formData.estado_civil === 'CASADO' && !formData.nupcias) newErrors.nupcias = true;

    if (Object.keys(newErrors).length > 0) {
      errorsRef.current = newErrors;
      setModal({ type: 'ERROR', title: 'Error de Validación', msg: 'Faltan datos obligatorios.' });
      return;
    }

    setStatusMsg('Guardando...');

    try {
      const url = editingId ? `http://localhost:3000/api/clientes/${editingId}` : 'http://localhost:3000/api/clientes';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setModal({ type: 'INFO', title: 'IngedatW', msg: 'Operación exitosa.' });
        setStatusMsg('Guardado OK.');
        if (!editingId) handleNew(); // Limpiar si es nuevo
      } else {
        setModal({ type: 'ERROR', title: 'Error Ingesis', msg: data.error || 'Error desconocido.' });
      }
    } catch (err) {
      setModal({ type: 'ERROR', title: 'Error', msg: 'No se pudo conectar al servidor.' });
    }
  };

  const handlePrint = () => window.print();

  return (
    <>
      <div className="h-screen bg-[#55aaaa] flex items-center justify-center p-4 select-none print:hidden">
        <div className="win-window w-full max-w-5xl h-[90vh] flex flex-col relative">

          {/* TITLEBAR */}
          <div className="win-titlebar px-2 py-1 flex justify-between items-center select-none cursor-default">
            <div className="flex items-center gap-2">
              <span className="text-sm">IngedatW - [{viewMode === 'SEARCH' ? 'Nómina de Clientes' : 'Ficha de Cliente'}]</span>
            </div>
            <div className="flex gap-1">
              <WinControlBtn>_</WinControlBtn>
              <WinControlBtn>□</WinControlBtn>
              <WinControlBtn red>×</WinControlBtn>
            </div>
          </div>

          {/* MENU */}
          <div className="flex px-2 bg-[#ece9d8] border-b border-[#d4d0c8] gap-3 text-black py-0.5">
            {['Archivo', 'Edición', 'Ver', 'Herramientas', 'Ayuda'].map(m => (
              <span key={m} className="cursor-pointer hover:bg-[#000080] hover:text-white px-1.5 rounded-sm">{m}</span>
            ))}
          </div>

          {/* TOOLBAR */}
          <div className="flex p-1 gap-1 bg-[#ece9d8] border-b border-white shadow-[0px_1px_0px_#808080]">
            {viewMode === 'SEARCH' ? (
              <>
                <WinBtn icon={<FilePlus size={14} className="text-green-700" />} label="Nuevo" onClick={handleNew} disabled={!hasSearched || searchResults.length > 0} />
                <div className="border-l border-gray-400 border-r border-white mx-1"></div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs">Buscar:</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="win-input w-64"
                    placeholder="Ingrese Apellido o DNI..."
                    autoFocus
                  />
                  <WinBtn icon={<Search size={14} />} label="Buscar" onClick={() => { }} />
                </div>
              </>
            ) : (
              <>
                <WinBtn icon={<List size={14} className="text-black" />} label="Volver" onClick={handleBackToSearch} />
                <div className="border-l border-gray-400 border-r border-white mx-1"></div>
                <WinBtn icon={<FilePlus size={14} className="text-green-700" />} label="Nuevo" onClick={handleNew} />
                <WinBtn icon={<Save size={14} className="text-blue-700" />} label="Guardar" onClick={handleSave} />
                <WinBtn icon={<Printer size={14} />} label="Imprimir" onClick={handlePrint} />
              </>
            )}
          </div>

          {/* CONTENT */}
          <div className="flex-1 bg-[#ece9d8] border border-white border-t-white p-2 overflow-hidden shadow-[inset_1px_1px_0px_#808080,inset_-1px_-1px_0px_#fff]">

            {/* VISTA BUSCADOR */}
            {viewMode === 'SEARCH' && (
              <div className="h-full flex flex-col">
                <div className="bg-[#000080] text-white px-2 py-1 font-bold text-xs mb-1 flex justify-between">
                  <span>Resultados de la Búsqueda</span>
                  <span>{searchResults.length} Registros</span>
                </div>
                <div className="flex-1 bg-[#ffffcc] border border-gray-500 overflow-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-[#ece9d8] sticky top-0 shadow-sm">
                      <tr>
                        <th className="border border-gray-400 px-1 text-left w-10">Icon</th>
                        <th className="border border-gray-400 px-1 text-left">Apellido y Nombre / Razón Social</th>
                        <th className="border border-gray-400 px-1 text-left">Documento</th>
                        <th className="border border-gray-400 px-1 text-left">Domicilio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map(item => (
                        <tr key={item.id} onDoubleClick={() => handleSelectClient(item)} className="hover:bg-[#000080] hover:text-white cursor-pointer group">
                          <td className="border border-gray-300 px-1 text-center">👤</td>
                          <td className="border border-gray-300 px-1 font-bold">{item.apellido}, {item.nombres}</td>
                          <td className="border border-gray-300 px-1">{item.nro_doc}</td>
                          <td className="border border-gray-300 px-1">{item.domicilio}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {searchResults.length === 0 && hasSearched && (
                    <div className="text-center mt-10 text-gray-500">No se encontraron clientes. Puede crear uno nuevo.</div>
                  )}
                </div>
              </div>
            )}

            {/* VISTA FORMULARIO */}
            {viewMode === 'FORM' && (
              <div className="h-full flex flex-col">
                {/* TABS */}
                <div className="flex gap-0.5 translate-y-[1px] z-10 px-2">
                  <Tab label="Datos Generales" active={activeTab === 'DATOS'} onClick={() => setActiveTab('DATOS')} />
                  <Tab label="Contacto" active={activeTab === 'CONTACTO'} onClick={() => setActiveTab('CONTACTO')} />
                  <Tab label="Filiación" active={activeTab === 'FILIACION'} onClick={() => setActiveTab('FILIACION')} />
                </div>

                {/* TAB CONTENT */}
                <div className="flex-1 bg-[#ece9d8] border border-white border-t-white p-3 overflow-y-auto shadow-[inset_1px_1px_0px_#808080,inset_-1px_-1px_0px_#fff]">

                  {activeTab === 'DATOS' && (
                    <div className="grid grid-cols-12 gap-x-4 gap-y-2">
                      <FieldSet title="Identidad" className="col-span-12 grid grid-cols-12 gap-2">
                        <div className="col-span-2">
                          <Label>Sexo</Label>
                          <div className="flex gap-2 mt-1">
                            <label className="flex items-center text-xs"><input type="radio" name="sexo" value="M" checked={formData.sexo === 'M'} onChange={handleInputChange} /> Masc</label>
                            <label className="flex items-center text-xs"><input type="radio" name="sexo" value="F" checked={formData.sexo === 'F'} onChange={handleInputChange} /> Fem</label>
                          </div>
                        </div>
                        <Input label="Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} required error={errorsRef.current.apellido} col="col-span-5" autoFocus />
                        <Input label="Nombres" name="nombres" value={formData.nombres} onChange={handleInputChange} required error={errorsRef.current.nombres} col="col-span-5" />
                      </FieldSet>

                      <FieldSet title="Documento" className="col-span-12 grid grid-cols-12 gap-2">
                        <div className="col-span-2">
                          <Label>Tipo Doc</Label>
                          <select name="tipo_doc" value={formData.tipo_doc} onChange={handleInputChange} className="win-input w-full">
                            <option>DNI</option><option>LE</option><option>LC</option><option>PAS</option>
                          </select>
                        </div>
                        <Input label="Número" name="nro_doc" value={formData.nro_doc} onChange={handleInputChange} required error={errorsRef.current.nro_doc} col="col-span-3" />
                        <Input label="Nacionalidad" name="nacionalidad" value={formData.nacionalidad} onChange={handleInputChange} col="col-span-3" />
                        <Input label="Fecha Nac." name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleInputChange} col="col-span-2" placeholder="DD/MM/AAAA" />
                      </FieldSet>

                      <FieldSet title="Estado Civil" className="col-span-12 grid grid-cols-12 gap-2">
                        <div className="col-span-3">
                          <Label required>Estado Civil</Label>
                          <select name="estado_civil" value={formData.estado_civil} onChange={handleInputChange} className="win-input w-full">
                            <option value="SOLTERO">Soltero</option>
                            <option value="CASADO">Casado</option>
                            <option value="DIVORCIADO">Divorciado</option>
                            <option value="VIUDO">Viudo</option>
                          </select>
                        </div>

                        <div className="col-span-2">
                          <Label>Nupcias</Label>
                          <select name="nupcias" value={formData.nupcias} onChange={handleInputChange} disabled={formData.estado_civil !== 'CASADO'} className={`win-input w-full ${errorsRef.current.nupcias ? 'validation-error' : ''}`}>
                            <option value="">-</option><option value="1">1ras</option><option value="2">2das</option><option value="3">3ras</option>
                          </select>
                        </div>

                        <div className="col-span-7 relative">
                          <Label>Cónyuge</Label>
                          <div className="flex gap-1">
                            <input type="text" value={formData.nombre_conyuge_visual} readOnly className="win-input w-full bg-gray-100" placeholder="Seleccione cónyuge..." />
                            <button
                              onClick={() => setModal({ type: 'SPOUSE', title: 'Buscar Cónyuge' })}
                              disabled={formData.estado_civil !== 'CASADO'}
                              className="win-btn px-2"
                            >
                              🔍
                            </button>
                          </div>
                        </div>
                      </FieldSet>
                    </div>
                  )}

                  {activeTab === 'CONTACTO' && (
                    <div className="grid grid-cols-12 gap-4">
                      <FieldSet title="Ubicación" className="col-span-12 grid grid-cols-12 gap-2">
                        <Input label="Domicilio (Calle y Altura)" name="domicilio" value={formData.domicilio} onChange={handleInputChange} col="col-span-8" />
                        <Input label="Código Postal" name="cp" value={formData.cp} onChange={handleInputChange} col="col-span-4" />
                        <Input label="Localidad" name="localidad" value={formData.localidad} onChange={handleInputChange} col="col-span-6" />
                        <Input label="Provincia" name="provincia" value="Buenos Aires" disabled col="col-span-6" />
                      </FieldSet>
                      <FieldSet title="Contacto Digital" className="col-span-12 grid grid-cols-12 gap-2">
                        <Input label="Email" name="email" value={formData.email} onChange={handleInputChange} col="col-span-6" />
                        <Input label="Teléfono" name="telefono" value={formData.telefono} onChange={handleInputChange} col="col-span-6" />
                      </FieldSet>
                    </div>
                  )}

                  {activeTab === 'FILIACION' && (
                    <div className="grid grid-cols-12 gap-4">
                      <FieldSet title="Datos Filiatorios" className="col-span-12 grid grid-cols-12 gap-2">
                        <Input label="Nombre del Padre" name="nombre_padre" value={formData.nombre_padre} onChange={handleInputChange} col="col-span-12" />
                        <Input label="Nombre de la Madre" name="nombre_madre" value={formData.nombre_madre} onChange={handleInputChange} col="col-span-12" />
                      </FieldSet>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>

          {/* STATUS BAR */}
          <div className="bg-[#d4d0c8] border-t border-white p-1 flex gap-1 text-[10px] text-black">
            <div className="win-input flex items-center w-1/2 bg-[#ece9d8] px-2 text-gray-600">{statusMsg}</div>
            <div className="win-input flex items-center justify-center w-16 bg-[#ece9d8]">INS</div>
            <div className="win-input flex items-center justify-center w-16 bg-[#ece9d8]">NUM</div>
          </div>

          {/* MODALS */}
          {modal && (
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/10 backdrop-blur-[1px]">
              <div className={`win-window p-1 shadow-[5px_5px_15px_rgba(0,0,0,0.5)] ${modal.type === 'SPOUSE' ? 'w-[500px]' : 'w-[400px]'}`}>

                <div className={`win-titlebar px-2 py-1 flex justify-between items-center ${modal.type === 'ERROR' ? 'bg-gradient-to-r from-red-700 to-red-500' : ''}`}>
                  <span>{modal.title}</span>
                  <button onClick={() => setModal(null)} className="text-white hover:bg-white/20 px-1 rounded">×</button>
                </div>

                {modal.type === 'SPOUSE' ? (
                  <div className="p-2 bg-[#ece9d8]">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={spouseSearchTerm}
                        onChange={(e) => setSpouseSearchTerm(e.target.value)}
                        className="win-input flex-1"
                        placeholder="Buscar por apellido..."
                        autoFocus
                      />
                    </div>
                    <div className="h-40 bg-white border border-gray-400 overflow-y-auto">
                      {spouseResults.map(s => (
                        <div key={s.id} onClick={() => handleSpouseSelect(s)} className="p-1 hover:bg-[#000080] hover:text-white cursor-pointer text-xs border-b border-dotted border-gray-200">
                          {s.apellido}, {s.nombres} ({s.nro_doc})
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end mt-2">
                      <WinBtn label="Cancelar" onClick={() => setModal(null)} />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#ece9d8] flex flex-col items-center">
                    <div className="text-3xl mb-2">
                      {modal.type === 'ERROR' && '❌'}
                      {modal.type === 'INFO' && 'ℹ️'}
                      {modal.type === 'UIF' && <AlertTriangle size={32} className="text-yellow-600" />}
                    </div>
                    <p className="text-xs text-center mb-4">{modal.msg}</p>
                    <WinBtn label="Aceptar" onClick={() => setModal(null)} className="w-20" />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* PRINT VIEW */}
      <div className="hidden print:block p-8 bg-white text-black font-serif">
        <h1 className="text-2xl font-bold text-center mb-4">FICHA DE CLIENTE</h1>
        <div className="grid grid-cols-2 gap-4 text-sm border border-black p-4">
          <div><span className="font-bold">Apellido y Nombres:</span> {formData.apellido}, {formData.nombres}</div>
          <div><span className="font-bold">Documento:</span> {formData.tipo_doc} {formData.nro_doc}</div>
          <div><span className="font-bold">Domicilio:</span> {formData.domicilio}</div>
          <div><span className="font-bold">Localidad:</span> {formData.localidad} ({formData.cp})</div>
          <div><span className="font-bold">Estado Civil:</span> {formData.estado_civil}</div>
          {formData.estado_civil === 'CASADO' && (
            <div><span className="font-bold">Cónyuge:</span> {formData.nombre_conyuge_visual}</div>
          )}
        </div>
      </div>
    </>
  );
};

// --- COMPONENTES UI ---
const Input = ({ label, name, value, onChange, required, error, col, disabled, autoFocus, placeholder }) => (
  <div className={col}>
    <Label required={required}>{label}</Label>
    <input type="text" name={name} value={value} onChange={onChange} disabled={disabled} autoFocus={autoFocus} placeholder={placeholder}
      className={`win-input w-full ${error ? 'validation-error' : ''} ${disabled ? 'bg-gray-100 text-gray-500' : ''}`}
    />
  </div>
);

const Label = ({ children, required }) => (
  <label className="block text-black mb-0.5 select-none truncate text-[11px]">
    {children} {required && <span className="text-red-600">*</span>}
  </label>
);

const FieldSet = ({ title, children, className }) => (
  <div className={`win-fieldset ${className}`}>
    <span className="win-legend">{title}</span>
    {children}
  </div>
);

const WinBtn = ({ icon, label, onClick, disabled, className }) => (
  <button onClick={onClick} disabled={disabled} className={`win-btn gap-1 ${className}`}>
    {icon} {label}
  </button>
);

const WinControlBtn = ({ children, red }) => (
  <button className={`w-4 h-4 flex items-center justify-center border border-white shadow-[1px_1px_0px_#000] text-[9px] font-bold mb-0.5
    ${red ? 'bg-[#d13438] text-white' : 'bg-[#ece9d8] text-black'}`}>
    {children}
  </button>
);

const Tab = ({ label, active, onClick }) => (
  <div onClick={onClick} className={`px-3 py-1 cursor-pointer text-[11px] rounded-t-sm border-t border-l border-r border-gray-600 ${active ? 'bg-[#ece9d8] font-bold relative top-[1px] z-20 pb-1.5' : 'bg-[#d4d0c8] text-gray-600 mt-0.5'}`}>
    {label}
  </div>
);

export default App;