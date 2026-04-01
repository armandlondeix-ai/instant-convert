import React from 'react';
import {
  FileArchive,
  RefreshCcw,
  FileStack,
  ScanText,
  Settings,
  Info,
  ChevronRight,
  Minimize2,
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, t }) => {
  const menuItems = [
    { id: 'compresser', label: t.tabs.compresser, icon: <FileArchive size={20} /> },
    { id: 'convertir', label: t.tabs.convertir, icon: <RefreshCcw size={20} /> },
    { id: 'fusionner', label: t.tabs.fusionner, icon: <FileStack size={20} /> },
    { id: 'reduction', label: t.tabs.reduction, icon: <Minimize2 size={20} /> },
    { id: 'ocr', label: t.tabs.ocr, icon: <ScanText size={20} /> },
    { id: 'reglages', label: t.tabs.reglages, icon: <Settings size={20} /> },
    { id: 'apropos', label: t.tabs.apropos, icon: <Info size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">IC</div>
        <div>
          <h1>Instant Convert</h1>
          <p>{t.brandSubtitle}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
          >
            <div className="sidebar-link-main">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {activeTab === item.id && <ChevronRight size={16} />}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
