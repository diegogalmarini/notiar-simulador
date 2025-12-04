import React, { useState, useEffect, useRef } from 'react';
import { Save, FilePlus, Printer, X, Search, AlertTriangle } from 'lucide-react';

// --- BASE DE DATOS SIMULADA ---
const INITIAL_DB = [
  { id: 1, tipo: 'JURIDICA', denominacion: 'PAPELERA SARANDI S.A.', cuit: '30-11223344-5' },
  { id: 2, tipo: 'FISICA', apellido: 'GOMEZ', nombres: 'JUAN CARLOS', cuit: '20-12345678-9' },
  { id: 3, tipo: 'FISICA', apellido: 'PEREZ', nombres: 'MARIA', cuit: '27-98765432-1' }
];

// --- LISTA NEGRA UIF ---
const UIF_BLACKLIST = ['20-99999999-9', '20999999999'];

const App = () => {
  // Estado Global
  const [db, setDb] = useState(INITIAL_DB);
  const [activeTab, setActiveTab] = useState('FISICA');
  const [statusMsg, setStatusMsg] = useState('Listo.');
  const [modal, setModal] = useState(null); 
  
  // Estado del Buscador
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  // Estado Formulario
  const [formData, setFormData] = useState({
    apellido: '', nombres: '', tipo_doc: 'DNI', nro_doc: '', cuit: '', 
    f_nac: '', estado_civil: '', nupcias: '', conyuge: '',
    calle: '', numero: '', piso: '', cp: '', localidad: '', email: '',
    denominacion: '', personeria: '', rep_nombre: '', rep_caracter: ''
  });
  
  const errorsRef = useRef({});

  // --- LÓGICA ---

  // Delay de 3 Segundos
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length > 2) {
        setIsSearching(true);
        setStatusMsg('Buscando en base de datos...');
        setTimeout(() => {
          const results = db.filter(item => 
            (item.apellido && item.apellido.includes(searchTerm.toUpperCase())) ||
            (item.denominacion && item.denominacion.includes(searchTerm.toUpperCase())) ||
            item.cuit.includes(searchTerm)
          );
          setSearchResults(results);
          setIsSearching(false);
          setStatusMsg(results.length > 0 ? `${results.length} coincidencias.` : 'No encontrado.');
        }, 1500);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 3000);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, db]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    if (errorsRef.current[name]) delete errorsRef.current[name];
  };

  const handleBlurCuit = () => {
    if (UIF_BLACKLIST.includes(formData.cuit)) {
      setModal({ type: 'UIF', title: 'Control UIF', msg: 'CUIT en lista de observados (PEP/Terrorismo). Requiere documentación respaldatoria.' });
    }
  };

  const handleSelectClient = (client) => {
    setActiveTab(client.tipo);
    setFormData({
      apellido: client.apellido || '',
      nombres: client.nombres || '',
      tipo_doc: 'DNI',
      nro_doc: '', 
      cuit: client.cuit || '',
      f_nac: '',
      estado_civil: '',
      nupcias: '',
      conyuge: '',
      calle: '',
      numero: '',
      piso: '',
      cp: '',
      localidad: '',
      email: '',
      denominacion: client.denominacion || '',
      personeria: '',
      rep_nombre: '',
      rep_caracter: ''
    });
    setSearchTerm('');
    setSearchResults([]);
    setStatusMsg('Registro cargado correctamente.');
  };

  const handleSave = () => {
    let newErrors = {};
    if (activeTab === 'FISICA') {
      if (!formData.apellido) newErrors.apellido = true;
      if (!formData.nombres) newErrors.nombres = true;
      if (!formData.nro_doc) newErrors.nro_doc = true;
      if (!formData.cuit) newErrors.cuit = true;
      if (!formData.estado_civil) newErrors.estado_civil = true;
      if (['CASADO', 'VIUDO'].includes(formData.estado_civil) && !formData.nupcias) newErrors.nupcias = true;
    } else {
      if (!formData.denominacion) newErrors.denominacion = true;
      if (!formData.cuit) newErrors.cuit = true;
      if (!formData.personeria) newErrors.personeria = true;
    }

    if (Object.keys(newErrors).length > 0) {
      errorsRef.current = newErrors;
      setModal({ type: 'ERROR', title: 'Error de Validación', msg: 'Faltan datos obligatorios. Verifique los campos rojos.' });
      setStatusMsg('Error al guardar.');
    } else {
      const newItem = activeTab === 'FISICA' 
        ? { id: Date.now(), tipo: 'FISICA', apellido: formData.apellido, nombres: formData.nombres, cuit: formData.cuit }
        : { id: Date.now(), tipo: 'JURIDICA', denominacion: formData.denominacion, cuit: formData.cuit };
      setDb(prev => [...prev, newItem]);
      setModal({ type: 'INFO', title: 'IngedatW', msg: 'Grabación exitosa.' });
      setStatusMsg('Registro guardado.');
      handleNew();
    }
  };

  const handleNew = () => {
    setFormData({ apellido: '', nombres: '', tipo_doc: 'DNI', nro_doc: '', cuit: '', f_nac: '', estado_civil: '', nupcias: '', conyuge: '', calle: '', numero: '', piso: '', cp: '', localidad: '', email: '', denominacion: '', personeria: '', rep_nombre: '', rep_caracter: '' });
    errorsRef.current = {};
    setSearchTerm('');
    setSearchResults([]);
    setStatusMsg('Listo.');
  };

  return (
    <div className="h-screen bg-[#55aaaa] flex items-center justify-center p-4 select-none">
      
      {/* VENTANA PRINCIPAL */}
      <div className="win-window w-full max-w-4xl h-[85vh] flex flex-col relative">
        
        {/* Barra Título */}
        <div className="win-titlebar px-2 py-1 flex justify-between items-center select-none cursor-default">
          <div className="flex items-center gap-2">
            <span className="text-sm">IngedatW - [Ficha de Clientes]</span>
          </div>
          <div className="flex gap-1">
             <WinControlBtn>_</WinControlBtn>
             <WinControlBtn>□</WinControlBtn>
             <WinControlBtn red>×</WinControlBtn>
          </div>
        </div>

        {/* Menú */}
        <div className="flex px-2 bg-[#ece9d8] border-b border-[#d4d0c8] gap-3 text-black py-0.5">
           {['Archivo','Edición','Ver','Herramientas','Ayuda'].map(m => (
             <span key={m} className="cursor-pointer hover:bg-[#000080] hover:text-white px-1.5 rounded-sm">{m}</span>
           ))}
        </div>

        {/* Toolbar */}
        <div className="flex p-1 gap-1 bg-[#ece9d8] border-b border-white shadow-[0px_1px_0px_#808080]">
          <WinBtn icon={<FilePlus size={14} className="text-green-700"/>} label="Nuevo" onClick={handleNew} />
          <WinBtn icon={<Save size={14} className="text-blue-700"/>} label="Guardar" onClick={handleSave} />
          <div className="border-l border-gray-400 border-r border-white mx-1"></div>
          <WinBtn icon={<Printer size={14} />} label="Imprimir" disabled />
        </div>

        {/* Área de Búsqueda */}
        <div className="p-3 bg-[#ece9d8] relative z-50">
          <div className="flex flex-col w-1/3">
            <label className="font-bold mb-1 text-[#003c74]">Buscar Cliente</label>
            <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="win-input w-full pr-6"
                  placeholder="Apellido o CUIT..."
                />
                <Search size={14} className="absolute right-1 text-gray-500" />
                
                {searchResults.length > 0 && (
                  <div 
                    className="absolute top-full left-0 w-full border border-black shadow-xl max-h-40 overflow-y-auto text-[11px] mt-1 z-[100] text-black"
                    style={{ backgroundColor: 'white' }}
                  >
                     <div className="bg-[#000080] text-white px-1 py-0.5 font-bold sticky top-0" style={{ color: 'white' }}>Resultados ({searchResults.length})</div>
                     {searchResults.map(item => (
                       <div key={item.id} onClick={() => handleSelectClient(item)} className="p-1 hover:bg-[#316ac5] hover:text-white cursor-pointer border-b border-dotted border-gray-300">
                          {item.tipo === 'FISICA' ? `${item.apellido}, ${item.nombres}` : item.denominacion} <span className="text-gray-500">({item.cuit})</span>
                       </div>
                     ))}
                  </div>
                )}
            </div>
            
            {isSearching && <div className="text-blue-600 text-[10px] mt-1">⏳ Buscando...</div>}
          </div>
        </div>

        {/* Pestañas */}
        <div className="px-2 flex gap-0.5 translate-y-[1px] z-10 mt-1">
          <Tab label="Personas Físicas" active={activeTab === 'FISICA'} onClick={() => setActiveTab('FISICA')} />
          <Tab label="Personas Jurídicas" active={activeTab === 'JURIDICA'} onClick={() => setActiveTab('JURIDICA')} />
        </div>

        {/* Panel Principal */}
        <div className="flex-1 bg-[#ece9d8] border border-white border-t-white p-3 overflow-y-auto shadow-[inset_1px_1px_0px_#808080,inset_-1px_-1px_0px_#fff]">
          
          {activeTab === 'FISICA' && (
            <div className="grid grid-cols-12 gap-x-4 gap-y-1">
              <FieldSet title="Datos Identificatorios" className="col-span-12 grid grid-cols-12 gap-2">
                 <Input label="Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} required error={errorsRef.current.apellido} col="col-span-6" autoFocus />
                 <Input label="Nombres" name="nombres" value={formData.nombres} onChange={handleInputChange} required error={errorsRef.current.nombres} col="col-span-6" />
                 
                 <div className="col-span-2">
                   <Label>Tipo</Label>
                   <select className="win-input w-full"><option>DNI</option><option>LE</option></select>
                 </div>
                 <Input label="Nro. Doc" name="nro_doc" value={formData.nro_doc} onChange={handleInputChange} required error={errorsRef.current.nro_doc} col="col-span-4" />
                 <Input label="CUIT/CUIL/CDI" name="cuit" value={formData.cuit} onChange={handleInputChange} onBlur={handleBlurCuit} required error={errorsRef.current.cuit} col="col-span-3" />
                 <Input label="F. Nacim." name="f_nac" value={formData.f_nac} onChange={handleInputChange} col="col-span-3" placeholder="DD/MM/AAAA" />
              </FieldSet>

              <FieldSet title="Estado Civil & Nupcias" className="col-span-12 grid grid-cols-12 gap-2">
                 <div className="col-span-4">
                    <Label required>Estado Civil</Label>
                    <select name="estado_civil" value={formData.estado_civil} onChange={handleInputChange} 
                      className={`win-input w-full ${errorsRef.current.estado_civil ? 'validation-error' : ''}`}>
                      <option value="">Seleccionar...</option><option value="SOLTERO">Soltero</option><option value="CASADO">Casado</option><option value="VIUDO">Viudo</option>
                    </select>
                 </div>
                 
                 <div className="col-span-2">
                    <Label>Nupcias</Label>
                    <select name="nupcias" value={formData.nupcias} onChange={handleInputChange}
                      disabled={!['CASADO', 'VIUDO'].includes(formData.estado_civil)}
                      className={`win-input w-full ${errorsRef.current.nupcias ? 'validation-error' : ''}`}>
                      <option value="">-</option><option value="1">1ras</option><option value="2">2das</option>
                    </select>
                 </div>
                 <Input label="Nombre Cónyuge" name="conyuge" value={formData.conyuge} onChange={handleInputChange} disabled={!['CASADO', 'VIUDO'].includes(formData.estado_civil)} col="col-span-6" />
              </FieldSet>

              <FieldSet title="Domicilio Real" className="col-span-12 grid grid-cols-12 gap-2">
                 <Input label="Calle" name="calle" value={formData.calle} onChange={handleInputChange} col="col-span-6" />
                 <Input label="Nro" name="numero" value={formData.numero} onChange={handleInputChange} col="col-span-2" />
                 <Input label="Piso" name="piso" value={formData.piso} onChange={handleInputChange} col="col-span-2" />
                 <Input label="CP" name="cp" value={formData.cp} onChange={handleInputChange} col="col-span-2" />
                 <Input label="Localidad" name="localidad" value={formData.localidad} onChange={handleInputChange} col="col-span-6" />
                 <Input label="Email" name="email" value={formData.email} onChange={handleInputChange} col="col-span-6" />
              </FieldSet>
            </div>
          )}

          {activeTab === 'JURIDICA' && (
             <div className="grid grid-cols-12 gap-3">
                <FieldSet title="Datos Societarios" className="col-span-12 grid grid-cols-12 gap-2">
                  <Input label="Denominación Social" name="denominacion" value={formData.denominacion} onChange={handleInputChange} required error={errorsRef.current.denominacion} col="col-span-8" autoFocus />
                  <Input label="CUIT" name="cuit" value={formData.cuit} onChange={handleInputChange} onBlur={handleBlurCuit} required error={errorsRef.current.cuit} col="col-span-4" />
                </FieldSet>

                <FieldSet title="Personería (Texto para Escritura)" className="col-span-12">
                   <Label required>Texto Completo</Label>
                   <textarea name="personeria" value={formData.personeria} onChange={handleInputChange} rows={8}
                     className={`win-input w-full h-auto resize-none ${errorsRef.current.personeria ? 'validation-error' : ''}`} />
                </FieldSet>
             </div>
          )}
        </div>

        {/* Barra de Estado */}
        <div className="bg-[#d4d0c8] border-t border-white p-1 flex gap-1 text-[10px] text-black">
            <div className="win-input flex items-center w-1/2 bg-[#ece9d8] px-2 text-gray-600">{statusMsg}</div>
            <div className="win-input flex items-center justify-center w-16 bg-[#ece9d8]">INS</div>
            <div className="win-input flex items-center justify-center w-16 bg-[#ece9d8]">NUM</div>
        </div>

        {/* --- MODAL WINDOWS XP --- */}
        {modal && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/10 backdrop-blur-[1px]">
            <div className="win-window w-[400px] p-1 shadow-[5px_5px_15px_rgba(0,0,0,0.5)]">
              <div className={`win-titlebar px-2 py-1 flex justify-between items-center 
                  ${modal.type === 'ERROR' || modal.type === 'UIF' ? 'bg-gradient-to-r from-red-700 to-red-500' : ''}`}>
                 <span>{modal.title}</span>
                 <button onClick={() => setModal(null)} className="text-white hover:bg-white/20 px-1 rounded">×</button>
              </div>
              
              <div className="flex gap-4 px-6 py-6 items-start bg-[#ece9d8]">
                 <div className="text-3xl">
                    {modal.type === 'ERROR' && '❌'}
                    {modal.type === 'UIF' && <AlertTriangle size={32} className="text-yellow-600"/>}
                    {modal.type === 'INFO' && 'ℹ️'}
                 </div>
                 <div className="text-xs text-black mt-1">
                    {modal.msg}
                 </div>
              </div>

              <div className="flex justify-center gap-2 mb-2 mt-2">
                 <WinBtn label="Aceptar" onClick={() => setModal(null)} className="w-20 font-bold" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTES UI RETRO ---

const Input = ({ label, name, value, onChange, onBlur, required, error, col, disabled, autoFocus, placeholder }) => (
  <div className={col}>
    <Label required={required}>{label}</Label>
    <input type="text" name={name} value={value} onChange={onChange} onBlur={onBlur} disabled={disabled} autoFocus={autoFocus} placeholder={placeholder}
      className={`win-input w-full ${error ? 'validation-error' : ''}`} 
    />
  </div>
);

const Label = ({ children, required }) => (
  <label className="block text-black mb-0.5 select-none truncate">
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
  <div onClick={onClick} className={`px-3 py-1 cursor-pointer text-[11px] rounded-t-sm ${active ? 'win-tab-active' : 'win-tab-inactive'}`}>
    {label}
  </div>
);

export default App;