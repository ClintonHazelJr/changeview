import { useState } from "react";
import {
  Building2, MapPin, Users, UserCircle2, Plus, X, Check, ChevronRight, ChevronLeft, ChevronDown,
  Menu, Search, Briefcase, Mail, Tag, FileText, AlertTriangle, GraduationCap, MessageSquare,
  Sparkles, Loader2, Copy, LayoutGrid, Settings
} from "lucide-react";

const C = {
  purple: "#7C6FF0", teal: "#2DD4BF", coral: "#FF8C82", green: "#34D399", amber: "#FBBF24",
  ink: "#1E2140", sub: "#8A8CA5", bg: "#F8F8FC", border: "#EFEFF6",
};
const HEAD = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const BODY = { fontFamily: "'Inter', sans-serif" };
const tint = (hex, a = "16") => hex + a;
const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
const SEVERITY_COLOR = { low: C.green, medium: C.amber, high: C.coral };
const TAG_OPTIONS = ["Training", "Huddle", "Email", "Documentation"];

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-3xl w-full ${wide ? "max-w-xl" : "max-w-md"} shadow-2xl max-h-[90vh] overflow-y-auto`} style={BODY}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: C.border }}>
          <h3 className="font-bold" style={{ ...HEAD, color: C.ink }}>{title}</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <div className="mb-4"><label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>{label}</label>{children}</div>;
}
const inputClass = "w-full border rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent";
const inputStyle = { borderColor: C.border, color: C.ink };
function Pill({ active, color, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-semibold px-3 py-1.5 rounded-full border mr-2 mb-2 transition-colors"
      style={active ? { background: color, borderColor: color, color: "#fff" } : { background: "#fff", borderColor: C.border, color: C.sub }}>
      {children}
    </button>
  );
}
function SaveRow({ label = "Save" }) {
  return <div className="flex justify-end gap-2 mt-2 sticky bottom-0 bg-white pt-2">
    <button type="submit" className="text-sm font-bold text-white px-5 py-2.5 rounded-full shadow-sm" style={{ background: C.purple }}>{label}</button>
  </div>;
}
function ListCard({ icon: Icon, color, title, subtitle, tag }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-3" style={{ borderColor: C.border }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: tint(color, "18") }}><Icon size={16} style={{ color }} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{title}</div>
        {subtitle && <div className="text-xs truncate" style={{ color: C.sub }}>{subtitle}</div>}
      </div>
      {tag && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: tint(color, "16"), color }}>{tag}</span>}
    </div>
  );
}
function TabSection({ title, subtitle, onAdd, addLabel, color, disabled, disabledText, empty, emptyText, emptyIcon: EmptyIcon, children }) {
  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-extrabold" style={{ ...HEAD, color: C.ink }}>{title}</h2>
        <button onClick={onAdd} disabled={disabled} className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-40 shadow-sm" style={{ background: color }}>
          <Plus size={15} /> {addLabel}
        </button>
      </div>
      <p className="text-sm mb-5" style={{ color: C.sub }}>{disabled ? disabledText : subtitle}</p>
      {empty ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          {EmptyIcon && <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(color, "16") }}><EmptyIcon size={20} style={{ color }} /></div>}
          <div className="text-sm" style={{ color: C.sub }}>{emptyText}</div>
        </div>
      ) : children}
    </div>
  );
}

const emptyWorkspaceData = () => ({
  companies: [], departments: [], people: [], teams: [],
  initiatives: [], initiativeData: {},
});

export default function ChangeViewApp() {
  const [section, setSection] = useState("admin"); // admin | initiatives
  const [adminTab, setAdminTab] = useState("org");
  const [selectedInitId, setSelectedInitId] = useState(null);
  const [initTab, setInitTab] = useState("details");
  const [modal, setModal] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [planTier] = useState("tier_2");

  const [workspaces, setWorkspaces] = useState([{ id: "ws-pepsi", name: "Pepsi" }, { id: "ws-cocacola", name: "Coca-Cola" }]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("ws-pepsi");
  const [dataByWorkspace, setDataByWorkspace] = useState({
    "ws-pepsi": emptyWorkspaceData(),
    "ws-cocacola": emptyWorkspaceData(),
  });

  const ws = dataByWorkspace[activeWorkspaceId] || emptyWorkspaceData();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const selectedInit = ws.initiatives.find((i) => i.id === selectedInitId);
  const initData = ws.initiativeData[selectedInitId] || { impacts: [], stakeholders: [], learningNeeds: [], comms: [] };

  function patchWs(patch) { setDataByWorkspace({ ...dataByWorkspace, [activeWorkspaceId]: { ...ws, ...patch } }); }
  function patchInit(patch) {
    patchWs({ initiativeData: { ...ws.initiativeData, [selectedInitId]: { ...initData, ...patch } } });
  }
  function switchWorkspace(id) {
    setActiveWorkspaceId(id); setPickerOpen(false); setSection("admin"); setAdminTab("org"); setSelectedInitId(null);
  }
  function addWorkspace(name) {
    if (planTier === "tier_1" && workspaces.length >= 1) { setModal(null); return; }
    const id = crypto.randomUUID();
    setWorkspaces([...workspaces, { id, name }]);
    setDataByWorkspace({ ...dataByWorkspace, [id]: emptyWorkspaceData() });
    switchWorkspace(id); setModal(null);
  }

  // System Admin actions
  const addCompany = (name) => { patchWs({ companies: [...ws.companies, { id: crypto.randomUUID(), name }] }); setModal(null); };
  const addDepartment = (data) => { patchWs({ departments: [...ws.departments, { id: crypto.randomUUID(), ...data }] }); setModal(null); };
  const addPerson = (data) => { patchWs({ people: [...ws.people, { id: crypto.randomUUID(), ...data }] }); setModal(null); };
  const addTeam = (name) => { patchWs({ teams: [...ws.teams, { id: crypto.randomUUID(), name, members: [] }] }); setModal(null); };
  const addTeamMember = (teamId, personId, role) => {
    patchWs({ teams: ws.teams.map((t) => t.id === teamId ? { ...t, members: [...t.members, { id: crypto.randomUUID(), personId, role }] } : t) });
    setModal(null);
  };

  // Initiative actions
  function addInitiative(vals) {
    const id = crypto.randomUUID();
    patchWs({
      initiatives: [...ws.initiatives, { id, status: "planning", ...vals }],
      initiativeData: { ...ws.initiativeData, [id]: { impacts: [], stakeholders: [], learningNeeds: [], comms: [] } },
    });
    setModal(null); setSelectedInitId(id); setInitTab("details"); setSection("initiatives");
  }
  const addImpact = (v) => { patchInit({ impacts: [...initData.impacts, { id: crypto.randomUUID(), ...v }] }); setModal(null); };
  const addStakeholder = (v) => { patchInit({ stakeholders: [...initData.stakeholders, { id: crypto.randomUUID(), ...v }] }); setModal(null); };
  const addLearningNeed = (v) => { patchInit({ learningNeeds: [...initData.learningNeeds, { id: crypto.randomUUID(), ...v }] }); setModal(null); };
  const addComms = (v) => { patchInit({ comms: [...initData.comms, { id: crypto.randomUUID(), ...v }] }); setModal(null); };

  const deptName = (id) => ws.departments.find((d) => d.id === id)?.name || "—";
  const personName = (id) => ws.people.find((p) => p.id === id)?.name || "—";
  const impactLabel = (id) => { const i = initData.impacts.find((x) => x.id === id); return i ? `${deptName(i.departmentId)} impact` : "—"; };

  const adminSteps = [
    { key: "org", label: "Org", icon: Building2, color: C.purple, count: ws.companies.length },
    { key: "department", label: "Department", icon: MapPin, color: C.teal, count: ws.departments.length },
    { key: "people", label: "People", icon: UserCircle2, color: C.coral, count: ws.people.length },
    { key: "teams", label: "Project Teams", icon: Users, color: C.green, count: ws.teams.length },
  ];
  const initTabs = [
    { key: "details", label: "Details", icon: FileText, color: C.purple },
    { key: "impacts", label: "Impacts", icon: AlertTriangle, color: C.coral, count: initData.impacts.length },
    { key: "stakeholders", label: "Stakeholders", icon: Users, color: C.teal, count: initData.stakeholders.length },
    { key: "learning", label: "Learning Needs", icon: GraduationCap, color: C.amber, count: initData.learningNeeds.length },
    { key: "comms", label: "Comms", icon: MessageSquare, color: C.green, count: initData.comms.length },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ ...BODY, background: C.bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        input:focus, select:focus, textarea:focus { --tw-ring-color: ${C.purple}44; }`}</style>

      {/* Top nav */}
      <div className="flex items-center gap-4 px-6 py-3.5 bg-white border-b" style={{ borderColor: C.border }}>
        <Menu size={20} style={{ color: C.sub }} />
        <span className="font-extrabold tracking-tight text-lg" style={{ ...HEAD, color: C.ink }}>ChangeView</span>

        <div className="relative">
          <button onClick={() => setPickerOpen(!pickerOpen)} className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold" style={{ background: tint(C.purple, "14"), color: C.purple }}>
            <Briefcase size={14} />{activeWorkspace?.name}
            <ChevronDown size={14} className={pickerOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {pickerOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border" style={{ borderColor: C.border }}>
              <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide border-b" style={{ color: C.sub, borderColor: C.border }}>Your Workspaces</div>
              {workspaces.map((w) => (
                <button key={w.id} onClick={() => switchWorkspace(w.id)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 text-left">
                  <span style={{ color: w.id === activeWorkspaceId ? C.ink : C.sub, fontWeight: w.id === activeWorkspaceId ? 700 : 500 }}>{w.name}</span>
                  {w.id === activeWorkspaceId && <Check size={14} style={{ color: C.teal }} />}
                </button>
              ))}
              <button onClick={() => { setModal("newWorkspace"); setPickerOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm border-t font-semibold" style={{ color: C.purple, borderColor: C.border }}>
                <Plus size={14} /> New workspace
              </button>
              {planTier === "tier_1" && <div className="px-4 py-2 text-[11px] border-t" style={{ color: C.sub, borderColor: C.border }}>Tier 1 includes 1 workspace. Upgrade for unlimited.</div>}
            </div>
          )}
        </div>

        {/* Section switcher */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-full p-1">
          <button onClick={() => setSection("admin")} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
            style={{ background: section === "admin" ? "#fff" : "transparent", color: section === "admin" ? C.ink : C.sub, boxShadow: section === "admin" ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
            <Settings size={13} /> System Admin
          </button>
          <button onClick={() => setSection("initiatives")} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
            style={{ background: section === "initiatives" ? "#fff" : "transparent", color: section === "initiatives" ? C.ink : C.sub, boxShadow: section === "initiatives" ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
            <LayoutGrid size={13} /> Initiatives
          </button>
        </div>

        <div className="flex-1 max-w-md ml-2 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.sub }} />
          <input placeholder="Search" disabled className="w-full rounded-full text-sm pl-9 pr-3 py-1.5 outline-none" style={{ background: C.bg, color: C.sub }} />
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: C.purple }}>{initials(activeWorkspace?.name)}</div>
      </div>

      {section === "admin" ? (
        <div className="flex flex-1">
          <div className="w-56 bg-white border-r flex flex-col py-5 px-3" style={{ borderColor: C.border }}>
            <div className="px-3 mb-4">
              <div className="text-[11px] font-bold tracking-wide uppercase mb-1" style={{ color: C.sub }}>System Admin</div>
              <div className="text-xs" style={{ color: C.sub }}>{adminSteps.filter((s) => s.count > 0).length} of 4 set up</div>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: C.border }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(adminSteps.filter((s) => s.count > 0).length / 4) * 100}%`, background: C.teal }} />
              </div>
            </div>
            {adminSteps.map((s) => (
              <button key={s.key} onClick={() => setAdminTab(s.key)} className="flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 rounded-r-xl text-sm text-left mb-1 border-l-4"
                style={{ borderColor: adminTab === s.key ? s.color : "transparent", background: adminTab === s.key ? tint(s.color, "10") : "transparent", color: adminTab === s.key ? C.ink : C.sub, fontWeight: adminTab === s.key ? 700 : 500 }}>
                <s.icon size={15} style={{ color: adminTab === s.key ? s.color : C.sub }} />
                {s.label}
                {s.count > 0 && <span className="ml-auto text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ background: tint(s.color, "20"), color: s.color }}>{s.count}</span>}
              </button>
            ))}
          </div>

          <div className="flex-1 p-8 max-w-4xl">
            {adminSteps.filter((s) => s.count > 0).length === 0 && (
              <div className="rounded-3xl p-7 mb-6" style={{ background: `linear-gradient(120deg, ${tint(C.purple, "12")}, ${tint(C.teal, "10")})` }}>
                <div className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Welcome to {activeWorkspace?.name}</div>
                <p className="text-sm max-w-md" style={{ color: C.sub }}>Set up your Org, Department, People, and Project Teams, in that order, then head to Initiatives.</p>
              </div>
            )}
            <div className="grid grid-cols-4 gap-3 mb-7">
              {adminSteps.map((s) => (
                <div key={s.key} className="rounded-3xl p-4 text-white relative overflow-hidden" style={{ background: s.color }}>
                  <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center mb-3"><s.icon size={15} /></div>
                  <div className="text-2xl font-extrabold" style={HEAD}>{s.count}</div>
                  <div className="text-xs font-medium opacity-90">{s.label}</div>
                </div>
              ))}
            </div>

            {adminTab === "org" && (
              <TabSection title="Org" subtitle={`Add each client company you'll run change work for inside ${activeWorkspace?.name}.`} onAdd={() => setModal("org")} addLabel="Add Org" color={C.purple}
                empty={ws.companies.length === 0} emptyText="No orgs yet. Add your first company to get started." emptyIcon={Building2}>
                <div className="grid grid-cols-2 gap-3">{ws.companies.map((c) => <ListCard key={c.id} icon={Building2} color={C.purple} title={c.name} subtitle="Company" />)}</div>
              </TabSection>
            )}
            {adminTab === "department" && (
              <TabSection title="Department" subtitle="Departments sit under an Org and tag who's impacted on every Impact record." onAdd={() => setModal("department")} addLabel="Add Department" color={C.teal}
                disabled={ws.companies.length === 0} disabledText="Add an Org first." empty={ws.departments.length === 0} emptyText="No departments yet." emptyIcon={MapPin}>
                <div className="grid grid-cols-2 gap-3">{ws.departments.map((d) => <ListCard key={d.id} icon={MapPin} color={C.teal} title={d.name} subtitle={ws.companies.find((c) => c.id === d.orgId)?.name} tag={d.location} />)}</div>
              </TabSection>
            )}
            {adminTab === "people" && (
              <TabSection title="People" subtitle="Your directory. Add someone once here, then reuse them as a Stakeholder or Team Member on any Initiative." onAdd={() => setModal("people")} addLabel="Add Person" color={C.coral}
                disabled={ws.departments.length === 0} disabledText="Add a Department first." empty={ws.people.length === 0} emptyText="No people yet." emptyIcon={UserCircle2}>
                <div className="grid grid-cols-2 gap-3">
                  {ws.people.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border flex items-start gap-3" style={{ borderColor: C.border }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: C.coral }}>{initials(p.name)}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{p.name}</div>
                        <div className="text-xs truncate" style={{ color: C.sub }}>{p.title || "—"} · {deptName(p.departmentId)}</div>
                        {p.email && <div className="flex items-center gap-1 text-xs mt-1 truncate" style={{ color: C.sub }}><Mail size={11} />{p.email}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </TabSection>
            )}
            {adminTab === "teams" && (
              <TabSection title="Project Teams" subtitle="Group People into a team, so you can assign a whole team to an Initiative in one go." onAdd={() => setModal("team")} addLabel="Add Project Team" color={C.green}
                disabled={ws.people.length === 0} disabledText="Add at least one Person first." empty={ws.teams.length === 0} emptyText="No project teams yet." emptyIcon={Users}>
                <div className="space-y-3">
                  {ws.teams.map((t) => (
                    <div key={t.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: C.border }}>
                      <button onClick={() => setExpandedTeam(expandedTeam === t.id ? null : t.id)} className="w-full flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: tint(C.green, "20") }}><Users size={14} style={{ color: C.green }} /></div>
                          <span className="text-sm font-bold" style={{ color: C.ink }}>{t.name}</span>
                        </div>
                        <span className="flex items-center gap-2 text-xs" style={{ color: C.sub }}>
                          {t.members.length} member{t.members.length !== 1 ? "s" : ""}
                          <ChevronRight size={14} className="transition-transform" style={{ transform: expandedTeam === t.id ? "rotate(90deg)" : "none" }} />
                        </span>
                      </button>
                      {expandedTeam === t.id && (
                        <div className="px-4 py-3" style={{ background: C.bg }}>
                          {t.members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between text-sm py-2">
                              <span style={{ color: C.ink }}>{personName(m.personId)}</span>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: tint(C.green, "18"), color: "#1a8a5f" }}><Tag size={10} className="inline mr-1" />{m.role}</span>
                            </div>
                          ))}
                          <button onClick={() => setModal({ type: "teamMember", teamId: t.id })} className="flex items-center gap-1.5 text-xs font-bold mt-2" style={{ color: C.purple }}><Plus size={13} /> Add team member</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabSection>
            )}
          </div>
        </div>
      ) : !selectedInit ? (
        <div className="flex-1 p-8 max-w-4xl w-full mx-auto">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-xl font-extrabold" style={{ ...HEAD, color: C.ink }}>Initiatives — {activeWorkspace?.name}</h2>
            <button onClick={() => setModal("initiative")} disabled={ws.companies.length === 0} className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-40 shadow-sm" style={{ background: C.purple }}>
              <Plus size={15} /> Add Initiative
            </button>
          </div>
          <p className="text-sm mb-5" style={{ color: C.sub }}>
            {ws.companies.length === 0 ? "Set up an Org in System Admin first." : "Pick one to open its Impacts, Stakeholders, Learning Needs, and Comms."}
          </p>
          {ws.initiatives.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(C.purple, "16") }}><LayoutGrid size={20} style={{ color: C.purple }} /></div>
              <div className="text-sm" style={{ color: C.sub }}>No initiatives yet.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ws.initiatives.map((i) => (
                <button key={i.id} onClick={() => { setSelectedInitId(i.id); setInitTab("details"); }} className="bg-white rounded-2xl p-4 shadow-sm border text-left hover:shadow-md transition-shadow" style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: tint(C.purple, "18") }}><Building2 size={16} style={{ color: C.purple }} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{i.name}</div>
                      <div className="text-xs" style={{ color: C.sub }}>{i.status}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: C.sub }} />
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: C.sub }}>{i.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1">
          <div className="w-56 bg-white border-r flex flex-col py-5 px-3" style={{ borderColor: C.border }}>
            <button onClick={() => setSelectedInitId(null)} className="flex items-center gap-1.5 text-xs font-semibold mb-4 px-2" style={{ color: C.sub }}><ChevronLeft size={14} /> All Initiatives</button>
            <div className="text-sm font-bold px-2 mb-4" style={{ ...HEAD, color: C.ink }}>{selectedInit.name}</div>
            {initTabs.map((t) => (
              <button key={t.key} onClick={() => setInitTab(t.key)} className="flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 rounded-r-xl text-sm text-left mb-1 border-l-4"
                style={{ borderColor: initTab === t.key ? t.color : "transparent", background: initTab === t.key ? tint(t.color, "10") : "transparent", color: initTab === t.key ? C.ink : C.sub, fontWeight: initTab === t.key ? 700 : 500 }}>
                <t.icon size={15} style={{ color: initTab === t.key ? t.color : C.sub }} />
                {t.label}
                {t.count > 0 && <span className="ml-auto text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ background: tint(t.color, "20"), color: t.color }}>{t.count}</span>}
              </button>
            ))}
          </div>

          <div className="flex-1 p-8 max-w-4xl">
            {initTab === "details" && (
              <div>
                <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>{selectedInit.name}</h2>
                <p className="text-sm mb-6" style={{ color: C.sub }}>{selectedInit.description}</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[["Status", selectedInit.status], ["Go Live Date", selectedInit.goLiveDate || "—"], ["Budget", selectedInit.budget ? `$${Number(selectedInit.budget).toLocaleString()}` : "—"], ["Change Owner", selectedInit.changeOwner || "—"], ["Project Manager", selectedInit.projectManager || "—"]].map(([label, val]) => (
                    <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: C.border }}>
                      <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: C.sub }}>{label}</div>
                      <div className="text-sm font-bold capitalize" style={{ color: C.ink }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border mb-3" style={{ borderColor: C.border }}>
                  <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: C.sub }}>Use Case</div>
                  <div className="text-sm" style={{ color: C.ink }}>{selectedInit.useCase || "—"}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: C.border }}>
                  <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: C.sub }}>Expected Benefits</div>
                  <div className="text-sm" style={{ color: C.ink }}>{selectedInit.expectedBenefits || "—"}</div>
                </div>
              </div>
            )}

            {initTab === "impacts" && (
              <TabSection title="Impacts" subtitle="Scope who and what is affected by this change." onAdd={() => setModal("impact")} addLabel="Add Impact" color={C.coral}
                empty={initData.impacts.length === 0} emptyText="No impacts recorded yet." emptyIcon={AlertTriangle}>
                <div className="space-y-3">
                  {initData.impacts.map((imp) => (
                    <div key={imp.id} className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: C.border }}>
                      <div className="text-sm font-bold mb-2" style={{ color: C.ink }}>{deptName(imp.departmentId)} · {imp.headcount} impacted</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {["org", "people", "process", "system", "environment"].map((k) => (
                          <span key={k} className="text-[10px] font-semibold px-2 py-1 rounded-full capitalize" style={{ background: tint(SEVERITY_COLOR[imp.severity[k]], "22"), color: SEVERITY_COLOR[imp.severity[k]] }}>{k}: {imp.severity[k]}</span>
                        ))}
                      </div>
                      <p className="text-xs mb-1" style={{ color: C.sub }}><b>Now:</b> {imp.currentProcess}</p>
                      <p className="text-xs" style={{ color: C.sub }}><b>Future:</b> {imp.futureProcess}</p>
                      <div className="flex gap-1.5 mt-2">{imp.tags.map((t) => <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tint(C.coral, "18"), color: C.coral }}>{t}</span>)}</div>
                    </div>
                  ))}
                </div>
              </TabSection>
            )}

            {initTab === "stakeholders" && (
              <TabSection title="Stakeholders" subtitle="Who's involved, and their RACI role on this Initiative." onAdd={() => setModal("stakeholder")} addLabel="Add Stakeholder" color={C.teal}
                disabled={ws.people.length === 0} disabledText="Add People in System Admin first."
                empty={initData.stakeholders.length === 0} emptyText="No stakeholders added yet." emptyIcon={Users}>
                <div className="grid grid-cols-2 gap-3">
                  {initData.stakeholders.map((s) => (
                    <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-3" style={{ borderColor: C.border }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: C.teal }}>{initials(personName(s.personId))}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{personName(s.personId)}</div>
                        <div className="text-xs truncate" style={{ color: C.sub }}>{s.role}</div>
                        <div className="flex gap-1 mt-1">{Object.entries(s.raci).filter(([, v]) => v).map(([k]) => <span key={k} className="text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center uppercase" style={{ background: tint(C.teal, "20"), color: C.teal }}>{k}</span>)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabSection>
            )}

            {initTab === "learning" && (
              <TabSection title="Learning Needs" subtitle="Training required per Impact, feeds directly into the delivery plan." onAdd={() => setModal("learning")} addLabel="Add Learning Need" color={C.amber}
                disabled={initData.impacts.length === 0} disabledText="Add an Impact first." empty={initData.learningNeeds.length === 0} emptyText="No learning needs yet." emptyIcon={GraduationCap}>
                <div className="space-y-2">
                  {initData.learningNeeds.map((ln) => (
                    <div key={ln.id} className="bg-white rounded-2xl p-4 shadow-sm border flex items-center justify-between" style={{ borderColor: C.border }}>
                      <div>
                        <div className="text-sm font-bold" style={{ color: C.ink }}>{ln.team} <span className="font-normal text-xs" style={{ color: C.sub }}>· {impactLabel(ln.impactId)}</span></div>
                        <div className="text-xs" style={{ color: C.sub }}>{ln.goal}</div>
                      </div>
                      <div className="text-right text-xs" style={{ color: C.sub }}><div className="font-semibold" style={{ color: C.amber }}>{ln.type}</div>{ln.headcount} people · {ln.sessions} session · {ln.hours}h</div>
                    </div>
                  ))}
                </div>
              </TabSection>
            )}

            {initTab === "comms" && (
              <TabSection title="Comms" subtitle="Draft and save communications, generated with AI from your Impact data." onAdd={() => setModal("comms")} addLabel="Add Comms" color={C.green}
                empty={initData.comms.length === 0} emptyText="No comms drafted yet." emptyIcon={MessageSquare}>
                <div className="space-y-3">
                  {initData.comms.map((c) => (
                    <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: C.border }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold" style={{ color: C.ink }}>{c.keyMessage || "Untitled"}</span>
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full capitalize" style={{ background: tint(C.green, "18"), color: "#1a8a5f" }}>{c.tone}</span>
                      </div>
                      <p className="text-xs mb-2" style={{ color: C.sub }}>{c.impactId ? impactLabel(c.impactId) : "Initiative-wide"} · {c.channel.join(", ") || "—"}</p>
                      {c.finalContent && <p className="text-xs whitespace-pre-wrap" style={{ color: C.ink }}>{c.finalContent}</p>}
                    </div>
                  ))}
                </div>
              </TabSection>
            )}
          </div>
        </div>
      )}

      {modal === "org" && <Modal title="Add Org" onClose={() => setModal(null)}><FormOrg onSave={addCompany} /></Modal>}
      {modal === "department" && <Modal title="Add Department" onClose={() => setModal(null)}><FormDepartment companies={ws.companies} onSave={addDepartment} /></Modal>}
      {modal === "people" && <Modal title="Add Person" onClose={() => setModal(null)}><FormPerson departments={ws.departments} onSave={addPerson} /></Modal>}
      {modal === "team" && <Modal title="Add Project Team" onClose={() => setModal(null)}><FormTeam onSave={addTeam} /></Modal>}
      {modal?.type === "teamMember" && <Modal title="Add Team Member" onClose={() => setModal(null)}><FormTeamMember people={ws.people} onSave={(personId, role) => addTeamMember(modal.teamId, personId, role)} /></Modal>}
      {modal === "newWorkspace" && <Modal title="New Workspace" onClose={() => setModal(null)}><FormWorkspace onSave={addWorkspace} /></Modal>}
      {modal === "initiative" && <Modal title="Add Initiative" onClose={() => setModal(null)}><FormInitiative people={ws.people} onSave={addInitiative} /></Modal>}
      {modal === "impact" && <Modal title="Add Impact" wide onClose={() => setModal(null)}><FormImpact departments={ws.departments} onSave={addImpact} /></Modal>}
      {modal === "stakeholder" && <Modal title="Add Stakeholder" onClose={() => setModal(null)}><FormStakeholder people={ws.people} onSave={addStakeholder} /></Modal>}
      {modal === "learning" && <Modal title="Add Learning Need" onClose={() => setModal(null)}><FormLearningNeed impacts={initData.impacts} deptName={deptName} onSave={addLearningNeed} /></Modal>}
      {modal === "comms" && <Modal title="Add Comms" wide onClose={() => setModal(null)}><FormComms initiative={selectedInit} impacts={initData.impacts} deptName={deptName} onSave={addComms} /></Modal>}
    </div>
  );
}

function FormOrg({ onSave }) {
  const [name, setName] = useState("");
  return <form onSubmit={(e) => { e.preventDefault(); if (name) onSave(name); }}>
    <Field label="Org"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Software Co" autoFocus /></Field>
    <SaveRow />
  </form>;
}
function FormDepartment({ companies, onSave }) {
  const [orgId, setOrgId] = useState(companies[0]?.id || "");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  return <form onSubmit={(e) => { e.preventDefault(); if (orgId && name) onSave({ orgId, name, location }); }}>
    <Field label="Org"><select className={inputClass} style={inputStyle} value={orgId} onChange={(e) => setOrgId(e.target.value)}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <Field label="Department"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operations" /></Field>
    <Field label="Location"><input className={inputClass} style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 123 Anytown US" /></Field>
    <SaveRow />
  </form>;
}
function FormPerson({ departments, onSave }) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [name, setName] = useState(""); const [title, setTitle] = useState(""); const [email, setEmail] = useState("");
  return <form onSubmit={(e) => { e.preventDefault(); if (name) onSave({ departmentId, name, title, email }); }}>
    <Field label="Name"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Micheal Blackman" autoFocus /></Field>
    <Field label="Department"><select className={inputClass} style={inputStyle} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
    <Field label="Title"><input className={inputClass} style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Change Manager" /></Field>
    <Field label="Email"><input className={inputClass} style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. blackman@software.co" /></Field>
    <SaveRow />
  </form>;
}
function FormTeam({ onSave }) {
  const [name, setName] = useState("");
  return <form onSubmit={(e) => { e.preventDefault(); if (name) onSave(name); }}>
    <Field label="Team name"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Agile Avengers" autoFocus /></Field>
    <SaveRow />
  </form>;
}
function FormTeamMember({ people, onSave }) {
  const [personId, setPersonId] = useState(people[0]?.id || ""); const [role, setRole] = useState("");
  return <form onSubmit={(e) => { e.preventDefault(); if (personId && role) onSave(personId, role); }}>
    <Field label="Person"><select className={inputClass} style={inputStyle} value={personId} onChange={(e) => setPersonId(e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Role on this team"><input className={inputClass} style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Project Manager" /></Field>
    <SaveRow />
  </form>;
}
function FormWorkspace({ onSave }) {
  const [name, setName] = useState("");
  return <form onSubmit={(e) => { e.preventDefault(); if (name) onSave(name); }}>
    <Field label="Workspace name"><input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coca-Cola" autoFocus /></Field>
    <SaveRow />
  </form>;
}
function FormInitiative({ people, onSave }) {
  const [vals, setVals] = useState({ name: "", description: "", goLiveDate: "", budget: "", useCase: "", expectedBenefits: "", changeOwner: "", projectManager: "" });
  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });
  return <form onSubmit={(e) => { e.preventDefault(); if (vals.name) onSave(vals); }}>
    <Field label="Initiative Name"><input className={inputClass} style={inputStyle} value={vals.name} onChange={set("name")} placeholder="e.g. Salesforce Rollout" autoFocus /></Field>
    <Field label="Description"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.description} onChange={set("description")} /></Field>
    <Field label="Proposed Go Live Date"><input type="date" className={inputClass} style={inputStyle} value={vals.goLiveDate} onChange={set("goLiveDate")} /></Field>
    <Field label="Budget"><input type="number" className={inputClass} style={inputStyle} value={vals.budget} onChange={set("budget")} placeholder="e.g. 45000" /></Field>
    <Field label="Use Case"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.useCase} onChange={set("useCase")} /></Field>
    <Field label="Expected Benefits"><textarea rows={2} className={inputClass} style={inputStyle} value={vals.expectedBenefits} onChange={set("expectedBenefits")} /></Field>
    <Field label="Change Owner"><select className={inputClass} style={inputStyle} value={vals.changeOwner} onChange={set("changeOwner")}><option value="">Select</option>{people.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></Field>
    <Field label="Project Manager"><select className={inputClass} style={inputStyle} value={vals.projectManager} onChange={set("projectManager")}><option value="">Select</option>{people.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></Field>
    <SaveRow />
  </form>;
}
function FormImpact({ departments, onSave }) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [headcount, setHeadcount] = useState("");
  const [currentSystem, setCurrentSystem] = useState(""); const [currentProcess, setCurrentProcess] = useState("");
  const [futureSystem, setFutureSystem] = useState(""); const [futureProcess, setFutureProcess] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState({ org: "low", people: "low", process: "low", system: "low", environment: "low" });
  const [tags, setTags] = useState([]);
  function toggleTag(t) { setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]); }
  return <form onSubmit={(e) => { e.preventDefault(); onSave({ departmentId, headcount: Number(headcount) || 0, currentSystem, currentProcess, futureSystem, futureProcess, description, severity, tags }); }}>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Department">{departments.length === 0 ? <p className="text-xs" style={{ color: C.sub }}>Add a Department in System Admin first.</p> : <select className={inputClass} style={inputStyle} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}</Field>
      <Field label="# Impacted"><input type="number" className={inputClass} style={inputStyle} value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="e.g. 30" /></Field>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Current State — System"><input className={inputClass} style={inputStyle} value={currentSystem} onChange={(e) => setCurrentSystem(e.target.value)} /></Field>
      <Field label="Future State — System"><input className={inputClass} style={inputStyle} value={futureSystem} onChange={(e) => setFutureSystem(e.target.value)} /></Field>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Current State — Process"><input className={inputClass} style={inputStyle} value={currentProcess} onChange={(e) => setCurrentProcess(e.target.value)} /></Field>
      <Field label="Future State — Process"><input className={inputClass} style={inputStyle} value={futureProcess} onChange={(e) => setFutureProcess(e.target.value)} /></Field>
    </div>
    <Field label="Impact Description"><textarea rows={2} className={inputClass} style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
    <Field label="Severity">
      <div className="space-y-2">
        {Object.keys(severity).map((k) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-xs capitalize font-medium" style={{ color: C.ink }}>{k}</span>
            <div className="flex gap-1.5">{["low", "medium", "high"].map((lvl) => <button type="button" key={lvl} onClick={() => setSeverity({ ...severity, [k]: lvl })} className="w-6 h-6 rounded-full border-2" style={{ background: severity[k] === lvl ? SEVERITY_COLOR[lvl] : "#fff", borderColor: SEVERITY_COLOR[lvl] }} />)}</div>
          </div>
        ))}
      </div>
    </Field>
    <Field label="Intervention"><div>{TAG_OPTIONS.map((t) => <Pill key={t} active={tags.includes(t)} color={C.coral} onClick={() => toggleTag(t)}>{t}</Pill>)}</div></Field>
    <SaveRow />
  </form>;
}
function FormStakeholder({ people, onSave }) {
  const [personId, setPersonId] = useState(people[0]?.id || ""); const [role, setRole] = useState("");
  const [raci, setRaci] = useState({ r: false, a: false, c: false, i: false });
  return <form onSubmit={(e) => { e.preventDefault(); onSave({ personId, role, raci }); }}>
    <Field label="Person">{people.length === 0 ? <p className="text-xs" style={{ color: C.sub }}>Add People in System Admin first.</p> : <select className={inputClass} style={inputStyle} value={personId} onChange={(e) => setPersonId(e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
    <Field label="Project Role"><input className={inputClass} style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. SME" /></Field>
    <Field label="RACI"><div className="flex gap-4">{[["r", "Responsible"], ["a", "Accountable"], ["c", "Consulted"], ["i", "Informed"]].map(([k, label]) => <label key={k} className="flex items-center gap-1.5 text-xs" style={{ color: C.ink }}><input type="checkbox" checked={raci[k]} onChange={(e) => setRaci({ ...raci, [k]: e.target.checked })} /> {label}</label>)}</div></Field>
    <SaveRow />
  </form>;
}
function FormLearningNeed({ impacts, deptName, onSave }) {
  const [impactId, setImpactId] = useState(impacts[0]?.id || "");
  const [team, setTeam] = useState(""); const [goal, setGoal] = useState(""); const [headcount, setHeadcount] = useState("");
  const [type, setType] = useState("Training"); const [sessions, setSessions] = useState(1); const [hours, setHours] = useState(0.5);
  return <form onSubmit={(e) => { e.preventDefault(); onSave({ impactId, team, goal, headcount: Number(headcount) || 0, type, sessions: Number(sessions), hours: Number(hours) }); }}>
    <Field label="Impact"><select className={inputClass} style={inputStyle} value={impactId} onChange={(e) => setImpactId(e.target.value)}>{impacts.map((i) => <option key={i.id} value={i.id}>{deptName(i.departmentId)} impact</option>)}</select></Field>
    <Field label="Team"><input className={inputClass} style={inputStyle} value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Credit Officers" /></Field>
    <Field label="Goal"><input className={inputClass} style={inputStyle} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Provide new laptops" /></Field>
    <div className="grid grid-cols-3 gap-3">
      <Field label="Headcount"><input type="number" className={inputClass} style={inputStyle} value={headcount} onChange={(e) => setHeadcount(e.target.value)} /></Field>
      <Field label="Type"><select className={inputClass} style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}><option>Training</option><option>Huddle</option></select></Field>
      <Field label="# Sessions"><input type="number" className={inputClass} style={inputStyle} value={sessions} onChange={(e) => setSessions(e.target.value)} /></Field>
    </div>
    <Field label="Time (hrs)"><input type="number" step="0.5" className={inputClass} style={inputStyle} value={hours} onChange={(e) => setHours(e.target.value)} /></Field>
    <SaveRow />
  </form>;
}
function FormComms({ initiative, impacts, deptName, onSave }) {
  const [impactId, setImpactId] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [audience, setAudience] = useState([]); const [tone, setTone] = useState("professional"); const [channel, setChannel] = useState([]);
  const [prompt, setPrompt] = useState(""); const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  function toggle(list, setList, val) { setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]); }
  async function generate() {
    setLoading(true); setError("");
    const impact = impacts.find((i) => i.id === impactId);
    const systemPrompt = `You write internal change management communications. Structure every message with: what's changing, why it's happening, what's different for the reader specifically, what they need to do, and where to get help. Keep it tight, no filler, no corporate jargon. Match the requested tone exactly. Output only the message itself, no preamble, no explanation, no subject line label.`;
    const userPrompt = `Initiative: ${initiative.name}\nInitiative description: ${initiative.description}\n${impact ? `Impact context: ${deptName(impact.departmentId)} team, current state "${impact.currentProcess}" moving to "${impact.futureProcess}". Severity: people impact is ${impact.severity.people}, system impact is ${impact.severity.system}.` : ""}\nKey message to convey: ${keyMessage || "General update on this initiative"}\nAudience: ${audience.join(", ") || "Internal"}\nTone: ${tone}\nChannel: ${channel.join(", ") || "Email"}\n${prompt ? `Additional instructions: ${prompt}` : ""}`;
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }),
      });
      const responseData = await response.json();
      const text = (responseData.content || []).map((b) => b.text || "").join("\n");
      setGenerated(text || "No content returned. Try again.");
    } catch (e) { setError("Couldn't generate right now. Try again in a moment."); }
    finally { setLoading(false); }
  }
  return <form onSubmit={(e) => { e.preventDefault(); onSave({ impactId, keyMessage, audience, tone, channel, finalContent: generated }); }}>
    <Field label="Impact (optional, leave blank for initiative-wide comms)"><select className={inputClass} style={inputStyle} value={impactId} onChange={(e) => setImpactId(e.target.value)}><option value="">Initiative-wide</option>{impacts.map((i) => <option key={i.id} value={i.id}>{deptName(i.departmentId)} impact</option>)}</select></Field>
    <Field label="Key Message"><input className={inputClass} style={inputStyle} value={keyMessage} onChange={(e) => setKeyMessage(e.target.value)} placeholder="e.g. Laptops arrive next week, training required first" /></Field>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Audience"><div>{["Internal", "Customer", "Leadership"].map((a) => <Pill key={a} active={audience.includes(a)} color={C.green} onClick={() => toggle(audience, setAudience, a)}>{a}</Pill>)}</div></Field>
      <Field label="Channel"><div>{["Email", "External", "Newsletter"].map((c) => <Pill key={c} active={channel.includes(c)} color={C.green} onClick={() => toggle(channel, setChannel, c)}>{c}</Pill>)}</div></Field>
    </div>
    <Field label="Tone"><div>{["professional", "playful", "caring"].map((t) => <Pill key={t} active={tone === t} color={C.purple} onClick={() => setTone(t)}>{t}</Pill>)}</div></Field>
    <Field label="Additional instructions (optional)"><input className={inputClass} style={inputStyle} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Keep it under 100 words" /></Field>
    <div className="rounded-2xl p-4 mb-4" style={{ background: tint(C.purple, "0A"), border: `1px solid ${tint(C.purple, "30")}` }}>
      <button type="button" onClick={generate} disabled={loading} className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full text-white shadow-sm disabled:opacity-60" style={{ background: C.purple }}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}{loading ? "Generating..." : "AI Comms Generator"}
      </button>
      {error && <p className="text-xs mt-2" style={{ color: C.coral }}>{error}</p>}
      {generated && (
        <div className="mt-4 bg-white rounded-xl p-4 border relative" style={{ borderColor: C.border }}>
          <button type="button" onClick={() => navigator.clipboard.writeText(generated)} className="absolute top-3 right-3 text-xs flex items-center gap-1" style={{ color: C.sub }}><Copy size={12} /> Copy</button>
          <textarea className="w-full text-sm bg-transparent outline-none resize-none" style={{ color: C.ink, minHeight: "140px" }} value={generated} onChange={(e) => setGenerated(e.target.value)} />
        </div>
      )}
    </div>
    <SaveRow label="Save Comms" />
  </form>;
}
