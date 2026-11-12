import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bike,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CloudSun,
  Filter,
  UtensilsCrossed,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  MapPin,
  Menu,
  Minus,
  MoreVertical,
  Percent,
  Phone,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type View = 'overview' | 'orders' | 'demand' | 'deliveries';
type OrderStatus = 'Pendiente' | 'En preparación' | 'En camino' | 'Entregado';

type Order = {
  id: string;
  customer: string;
  time: string;
  products: string;
  total: string;
  status: OrderStatus;
  delivery: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
};

type CartItem = Product & { quantity: number };
type NewOrder = { customerName: string; phone: string; address: string; deliveryType: string; paymentMethod: string; items: CartItem[]; total: number };

type OrderStats = { received: number; pending: number; preparing: number; delivered: number; inTransit: number };

const products: Product[] = [
  { id: 'pollo-1', name: '1/4 Pollo a la brasa', price: 18.9, category: 'Pollo a la brasa' },
  { id: 'pollo-2', name: '1/2 Pollo a la brasa', price: 31.9, category: 'Pollo a la brasa' },
  { id: 'costillas', name: 'Costillas BBQ', price: 24.9, category: 'Especialidades' },
  { id: 'hamburguesa', name: 'Hamburguesa Clásica', price: 16.5, category: 'Hamburguesas' },
  { id: 'papas', name: 'Papas fritas familiares', price: 11.9, category: 'Acompañamientos' },
  { id: 'gaseosa', name: 'Gaseosa personal', price: 4.5, category: 'Bebidas' },
];

const orders: Order[] = [
  { id: 'PED-2026-0128', customer: 'María López', time: '10:24', products: '2x Costillas BBQ, 1x Papas Fritas', total: 'S/ 35.40', status: 'Pendiente', delivery: 'Sin asignar' },
  { id: 'PED-2026-0127', customer: 'Carlos Ramírez', time: '10:20', products: '1x Hamburguesa Clásica, 1x Gaseosa', total: 'S/ 28.00', status: 'En preparación', delivery: 'Juan Pérez' },
  { id: 'PED-2026-0126', customer: 'Ana Torres', time: '10:15', products: '1x Costillas BBQ, 1x Ensalada César', total: 'S/ 32.50', status: 'En preparación', delivery: 'Luis Gómez' },
  { id: 'PED-2026-0125', customer: 'Pedro Sánchez', time: '10:05', products: '2x Hamburguesa Doble, 2x Papas Fritas', total: 'S/ 46.80', status: 'Entregado', delivery: 'Miguel Vargas' },
  { id: 'PED-2026-0124', customer: 'Lucía Fernández', time: '09:58', products: '1x Costillas BBQ, 1x Gaseosa', total: 'S/ 24.90', status: 'En camino', delivery: 'Carla Ruiz' },
  { id: 'PED-2026-0123', customer: 'Jorge Martínez', time: '09:45', products: '1x Hamburguesa Clásica, 1x Papas Fritas', total: 'S/ 22.50', status: 'Entregado', delivery: 'Diego Morales' },
];

const demandValues = [18, 11, 8, 10, 13, 16, 34, 72, 89, 76, 70, 78, 84, 80, 76, 66, 55, 61, 95, 128, 158, 212, 238, 185, 122];
const hourlyBars = [24, 17, 13, 10, 12, 16, 29, 68, 82, 75, 72, 77, 81, 79, 70, 62, 54, 65, 98, 121, 151, 190, 226, 205, 160, 112, 73, 35];

function App() {
  const [view, setView] = useState<View>('overview');
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'Todos' | OrderStatus>('Todos');
  const [predictionUpdated, setPredictionUpdated] = useState(false);
  const [orderList, setOrderList] = useState<Order[]>(orders);

  useEffect(() => {
    const loadOrders = async () => {
      const { data } = await supabase.from('porkys_orders').select('id, customer_name, items, total, status, created_at').order('created_at', { ascending: false });
      if (!data) return;
      const savedOrders: Order[] = data.map((row) => ({ id: `PED-${row.id.slice(0, 8).toUpperCase()}`, customer: row.customer_name, time: new Date(row.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), products: Array.isArray(row.items) ? row.items.map((item) => `${item.quantity}x ${item.name}`).join(', ') : 'Pedido registrado', total: `S/ ${Number(row.total).toFixed(2)}`, status: (row.status as OrderStatus) || 'Pendiente', delivery: 'Sin asignar' }));
      setOrderList((currentOrders) => [...savedOrders, ...currentOrders]);
    };
    void loadOrders();
  }, []);

  if (!signedIn) {
    return (
      <LoginScreen
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={() => setSignedIn(true)}
      />
    );
  }

  const filteredOrders = orderFilter === 'Todos' ? orderList : orderList.filter((order) => order.status === orderFilter);
  const stats: OrderStats = { received: orderList.length, pending: orderList.filter((order) => order.status === 'Pendiente').length, preparing: orderList.filter((order) => order.status === 'En preparación').length, delivered: orderList.filter((order) => order.status === 'Entregado').length, inTransit: orderList.filter((order) => order.status === 'En camino').length };
  const saveOrder = async (newOrder: NewOrder) => {
    const { data, error } = await supabase.from('porkys_orders').insert({ customer_name: newOrder.customerName, phone: newOrder.phone, delivery_address: newOrder.address, delivery_type: newOrder.deliveryType, payment_method: newOrder.paymentMethod, items: newOrder.items, total: newOrder.total }).select('id, customer_name, items, total, status, created_at').maybeSingle();
    if (error || !data) return false;
    const savedOrder: Order = { id: `PED-${data.id.slice(0, 8).toUpperCase()}`, customer: data.customer_name, time: new Date(data.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), products: newOrder.items.map((item) => `${item.quantity}x ${item.name}`).join(', '), total: `S/ ${Number(data.total).toFixed(2)}`, status: 'Pendiente', delivery: 'Sin asignar' };
    setOrderList((currentOrders) => [savedOrder, ...currentOrders]);
    return true;
  };

  return (
    <div className="app-shell">
      <Sidebar view={view} onChange={setView} />
      <main className="main-content">
        <Topbar onSignOut={() => setSignedIn(false)} />
        <div className="page-content">
          {view === 'overview' && <Overview stats={stats} rows={orderList} onNewOrder={() => setShowNewOrder(true)} onViewOrders={() => setView('orders')} />}
          {view === 'orders' && (
            <OrdersView
              orders={filteredOrders}
              stats={stats}
              filter={orderFilter}
              onFilterChange={setOrderFilter}
              onNewOrder={() => setShowNewOrder(true)}
            />
          )}
          {view === 'demand' && (
            <DemandView
              updated={predictionUpdated}
              onUpdate={() => setPredictionUpdated(true)}
            />
          )}
          {view === 'deliveries' && <DeliveriesView />}
        </div>
      </main>
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onSaved={saveOrder} />}
    </div>
  );
}

function LoginScreen({ email, password, onEmailChange, onPasswordChange, onSubmit }: { email: string; password: string; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <div className="login-screen">
      <section className="login-panel">
        <div className="brand-mark large"><img src="/image.png" alt="Porky's Pollería" /></div>
        <p className="login-kicker">Sistema Predictivo de Pedidos y Gestión de Demanda</p>
        <div className="login-copy">
          <h1>Iniciar sesión</h1>
          <p>Accede al sistema para gestionar pedidos, demanda y entregas.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <label>Correo electrónico</label>
          <div className="input-with-icon"><UserRound size={18} /><input required type="email" placeholder="nombre@porkys.pe" value={email} onChange={(event) => onEmailChange(event.target.value)} /></div>
          <label>Contraseña</label>
          <div className="input-with-icon"><LockKeyhole size={18} /><input required minLength={4} type="password" placeholder="••••••••" value={password} onChange={(event) => onPasswordChange(event.target.value)} /></div>
          <button className="text-button forgot" type="button">¿Olvidaste tu contraseña?</button>
          <button className="primary-button login-button" type="submit"><LogIn size={18} /> Ingresar</button>
        </form>
        <div className="login-footer"><span className="status-dot" /> Plataforma operativa segura</div>
      </section>
      <section className="login-visual">
        <div className="visual-glow glow-one" /><div className="visual-glow glow-two" />
        <div className="visual-header"><span className="visual-pill"><Sparkles size={14} /> Inteligencia para crecer</span><span>v1.0 MVP</span></div>
        <div className="visual-content"><img className="login-art-image" src="/image%20copy.png" alt="Panel de Porky's con pedidos, demanda y entregas" /><div className="floating-card stat-float"><TrendingUp size={18} /><strong>+18.4%</strong><span>demanda prevista</span></div><div className="floating-card delivery-float"><Bike size={17} /><div><strong>34</strong><span>entregas en curso</span></div></div></div>
        <div className="visual-footer"><span>Datos más claros.</span><strong>Decisiones más rápidas.</strong></div>
      </section>
    </div>
  );
}

function Sidebar({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const items: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Inicio', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { id: 'demand', label: 'Demanda', icon: BarChart3 },
    { id: 'deliveries', label: 'Entregas', icon: Bike },
  ];
  return <aside className="sidebar"><div className="sidebar-brand"><img className="sidebar-logo" src="/image.png" alt="Porky's Pollería" /></div><nav>{items.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => onChange(id)}><Icon size={18} />{label}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item"><Settings size={18} />Configuración</button><div className="sidebar-illustration"><Bike size={62} strokeWidth={1.2} /><span>Tu equipo, en control.</span></div></div></aside>;
}

function Topbar({ onSignOut }: { onSignOut: () => void }) {
  return <header className="topbar"><div className="mobile-menu"><Menu size={21} /></div><div className="breadcrumb"><span>Operaciones</span><b>/</b><strong>Panel de control</strong></div><div className="topbar-actions"><button className="icon-button notification"><Bell size={18} /><i>3</i></button><button className="profile-button" onClick={onSignOut}><span className="avatar">AM</span><span><strong>Administrador</strong><small>Sesión activa</small></span><ChevronDown size={15} /></button></div></header>;
}

function Overview({ stats, rows, onNewOrder, onViewOrders }: { stats: OrderStats; rows: Order[]; onNewOrder: () => void; onViewOrders: () => void }) {
  return <><PageHeading eyebrow="Domingo, 12 de octubre de 2026" title="Resumen operativo" subtitle="Una vista clara para tomar mejores decisiones hoy." action={<><button className="secondary-button" onClick={onViewOrders}><ShoppingBag size={16} /> Ver pedidos</button><button className="primary-button" onClick={onNewOrder}><Plus size={16} /> Registrar pedido</button></>} /><div className="metric-grid"><MetricCard label="Pedidos recibidos hoy" value={String(stats.received)} trend="18% vs ayer" icon={ShoppingBag} tone="red" positive /><MetricCard label="Pedidos pendientes" value={String(stats.pending)} trend="6% vs ayer" icon={Clock3} tone="amber" /><MetricCard label="Entregas en curso" value={String(stats.inTransit)} trend="12% vs ayer" icon={Bike} tone="green" positive /><MetricCard label="Tiempo promedio" value="24 min" trend="8% vs ayer" icon={Target} tone="blue" positive /></div><div className="overview-grid"><section className="panel recent-panel"><PanelHeading title="Pedidos recientes" action="Ver todos" onAction={onViewOrders} /><OrderTable rows={rows.slice(0, 5)} compact /></section><section className="panel demand-mini"><PanelHeading title="Demanda por horas" action="Hoy" /><div className="legend"><span className="legend-item history" /> Histórico <span className="legend-item forecast" /> Pronóstico</div><LineChart compact /><div className="mini-insight"><TrendingUp size={16} /><span>La demanda sube <strong>32%</strong> en la franja de 18:00 a 21:00.</span></div></section></div><section className="panel status-panel"><PanelHeading title="Estado de pedidos" action="Últimas 24 horas" /><div className="status-content"><DonutChart /><div className="status-list"><StatusRow color="green" label="Entregados" value="103" percent="42%" /><StatusRow color="blue" label="En preparación" value="59" percent="24%" /><StatusRow color="amber" label="En camino" value="34" percent="14%" /><StatusRow color="red" label="Pendientes" value="50" percent="20%" /></div><div className="total-status"><span>Total de pedidos</span><strong>246</strong></div></div></section></>;
}

function OrdersView({ orders: visibleOrders, stats, filter, onFilterChange, onNewOrder }: { orders: Order[]; stats: OrderStats; filter: 'Todos' | OrderStatus; onFilterChange: (filter: 'Todos' | OrderStatus) => void; onNewOrder: () => void }) {
  return <><PageHeading eyebrow="Operaciones / Pedidos" title="Gestión de pedidos" subtitle="Registra, organiza y monitorea cada solicitud en un solo lugar." action={<button className="primary-button" onClick={onNewOrder}><Plus size={16} /> Registrar pedido</button>} /><div className="metric-grid four"><MetricCard label="Recibidos hoy" value={String(stats.received)} trend="18% vs ayer" icon={ShoppingBag} tone="red" positive /><MetricCard label="Pendientes" value={String(stats.pending)} trend="7% vs ayer" icon={Clock3} tone="amber" /><MetricCard label="En preparación" value={String(stats.preparing)} trend="4% vs ayer" icon={UtensilsCrossed} tone="blue" /><MetricCard label="Completados" value={String(stats.delivered)} trend="22% vs ayer" icon={Check} tone="green" positive /></div><section className="panel full-panel"><div className="table-toolbar"><div className="search-input"><Search size={16} /><input placeholder="Buscar por código o cliente" /></div><div className="filter-group"><Filter size={15} />{(['Todos', 'Pendiente', 'En preparación', 'En camino', 'Entregado'] as const).map((option) => <button key={option} className={filter === option ? 'filter-option active' : 'filter-option'} onClick={() => onFilterChange(option)}>{option}</button>)}</div><button className="secondary-button export"><ArrowDownRight size={16} /> Exportar</button></div><OrderTable rows={visibleOrders} /></section></>;
}

function DemandView({ updated, onUpdate }: { updated: boolean; onUpdate: () => void }) {
  return <><PageHeading eyebrow="Análisis inteligente" title="Predicción de demanda" subtitle="Anticipa el ritmo del servicio y prepara a tu equipo." action={<><button className="date-button"><CalendarDays size={16} /> 12 – 13 de octubre, 2026 <ChevronDown size={14} /></button><button className="primary-button" onClick={onUpdate}><Sparkles size={16} /> {updated ? 'Predicción actualizada' : 'Actualizar predicción'}</button></>} /><div className="metric-grid four"><MetricCard label="Pedidos estimados hoy" value="186" trend="94.8% precisión" icon={ShoppingBag} tone="red" /><MetricCard label="Hora pico esperada" value="20:00" trend="+12% vs semana pasada" icon={Clock3} tone="amber" /><MetricCard label="Nivel de demanda" value="Alta" trend="Preparar refuerzo" icon={TrendingUp} tone="green" /><MetricCard label="Precisión del modelo" value="94,8%" trend="Regresión + KNN" icon={Target} tone="blue" /></div><div className="demand-layout"><div><section className="panel chart-panel"><PanelHeading title="Demanda histórica vs. pronosticada" action="Próximas 24 horas" /><div className="legend"><span className="legend-item history" /> Demanda histórica <span className="legend-item forecast" /> Demanda pronosticada</div><LineChart /></section><section className="panel bars-panel"><PanelHeading title="Demanda por horas" action="Pedidos estimados" /><BarChart /></section></div><div className="demand-side"><section className="panel variables-panel"><PanelHeading title="Variables consideradas" action={<Sparkles size={15} />} /><Variable icon={CalendarDays} label="Día" value="Domingo" /><Variable icon={Clock3} label="Hora" value="14:30" /><Variable icon={Percent} label="Promociones" value="Activa" accent /><Variable icon={CloudSun} label="Clima" value="Nublado, 22°C" /></section><section className="panel alerts-panel"><PanelHeading title="Alertas y recomendaciones" action="3 activas" /><AlertRow icon={AlertTriangle} tone="warning" text="Alta demanda esperada entre 7:00 p.m. y 9:00 p.m." /><AlertRow icon={UtensilsCrossed} tone="orange" text="Aumentar preparación de pollo y papas" /><AlertRow icon={Users} tone="success" text="Se recomienda mayor disponibilidad de repartidores" /></section></div></div></>;
}

function DeliveriesView() {
  const deliveries = [{ id: 'PORK-1001', customer: 'María González', address: 'Av. Siempre Viva 742', rider: 'Carlos Ramírez', time: '10:15', status: 'En camino', eta: '15 min' }, { id: 'PORK-1002', customer: 'Juan Pérez', address: 'Calle Falsa 123', rider: 'Ana Torres', time: '10:20', status: 'En camino', eta: '18 min' }, { id: 'PORK-1003', customer: 'Luis Martínez', address: 'Los Álamos 456', rider: 'Pedro Silva', time: '09:45', status: 'Retrasado', eta: '35 min' }, { id: 'PORK-1004', customer: 'Sofía López', address: 'Av. Central 890', rider: 'Diego Herrera', time: '10:08', status: 'En camino', eta: '12 min' }];
  return <><PageHeading eyebrow="Operaciones / Logística" title="Seguimiento de entregas" subtitle="Monitorea los pedidos activos y el rendimiento de las rutas." action={<button className="secondary-button"><MapPin size={16} /> Ver entregas retrasadas</button>} /><div className="metric-grid four"><MetricCard label="Entregas del día" value="128" trend="18% vs ayer" icon={ShoppingBag} tone="red" /><MetricCard label="Entregas en camino" value="24" trend="8% vs ayer" icon={Bike} tone="green" positive /><MetricCard label="Entregas retrasadas" value="3" trend="2% vs ayer" icon={Clock3} tone="amber" /><MetricCard label="Tiempo promedio" value="34 min" trend="5% vs ayer" icon={Target} tone="blue" /></div><div className="delivery-layout"><section className="panel full-panel"><PanelHeading title="Pedidos en reparto" action="Actualizado hace 2 min" /><div className="delivery-table">{deliveries.map((delivery) => <div className="delivery-row" key={delivery.id}><div><strong>{delivery.id}</strong><span>{delivery.customer}</span></div><div className="address"><MapPin size={14} />{delivery.address}</div><div><strong>{delivery.rider}</strong><span>Salida {delivery.time}</span></div><StatusBadge status={delivery.status === 'Retrasado' ? 'Pendiente' : 'En camino'} label={delivery.status} /><strong>{delivery.eta}</strong><button className="icon-button"><MoreVertical size={17} /></button></div>)}</div></section><section className="panel route-panel"><PanelHeading title="Rutas activas" action={<MapPin size={15} />} /><div className="map-placeholder"><div className="map-grid" /><div className="route route-a" /><div className="route route-b" /><div className="map-pin pin-a"><Bike size={14} /></div><div className="map-pin pin-b"><MapPin size={14} /></div><div className="map-pin pin-c"><MapPin size={14} /></div></div><div className="route-summary"><span><i className="route-dot green-dot" /> 24 en camino</span><span><i className="route-dot red-dot" /> 3 retrasadas</span></div></section></div></>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div><div className="heading-actions">{action}</div></div>; }
function MetricCard({ label, value, trend, icon: Icon, tone, positive }: { label: string; value: string; trend: string; icon: typeof ShoppingBag; tone: string; positive?: boolean }) { return <article className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={20} /></div><div className="metric-info"><span>{label}</span><strong>{value}</strong><small className={positive ? 'positive' : ''}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trend}</small></div></article>; }
function PanelHeading({ title, action, onAction }: { title: string; action?: ReactNode; onAction?: () => void }) { return <div className="panel-heading"><h2>{title}</h2>{typeof action === 'string' ? <button className="panel-action" onClick={onAction}>{action}</button> : <span className="panel-action-label">{action}</span>}</div>; }
function StatusBadge({ status, label }: { status: OrderStatus; label?: string }) { return <span className={`status-badge ${status.toLowerCase().replace(/ /g, '-')}`}>{label || status}</span>; }
function OrderTable({ rows, compact = false }: { rows: Order[]; compact?: boolean }) { return <div className={`orders-table ${compact ? 'compact' : ''}`}><div className="order-row order-head"><span>Código de pedido</span><span>Cliente</span><span>Hora</span><span>Productos</span><span>Estado</span><span>Repartidor</span><span /></div>{rows.map((order) => <div className="order-row" key={order.id}><strong>{order.id}</strong><span>{order.customer}</span><span>{order.time}</span><span className="product-cell">{order.products}</span><span><StatusBadge status={order.status} /></span><span>{order.delivery}</span><button className="icon-button"><MoreVertical size={16} /></button></div>)}</div>; }
function LineChart({ compact = false }: { compact?: boolean }) { const points = demandValues.map((value, index) => `${(index / (demandValues.length - 1)) * 100},${100 - (value / 250) * 82}`).join(' '); const forecast = '68,77 72,70 76,62 80,53 84,44 88,34 92,23 96,17'; return <div className={`line-chart ${compact ? 'compact-chart' : ''}`}><div className="chart-y-labels"><span>250</span><span>125</span><span>0</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><g className="grid-lines"><line x1="0" x2="100" y1="18" y2="18" /><line x1="0" x2="100" y1="50" y2="50" /><line x1="0" x2="100" y1="82" y2="82" /></g><polyline points={points} className="history-line" /><polyline points={`64,${100 - (demandValues[16] / 250) * 82} ${forecast}`} className="forecast-line" /></svg><div className="chart-x-labels"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></div>; }
function BarChart() { return <div className="bar-chart">{hourlyBars.map((height, index) => <div className="bar-column" key={`${height}-${index}`}><div className="bar" style={{ height: `${(height / 240) * 100}%` }} />{index % 3 === 0 && <span>{String(index).padStart(2, '0')}:00</span>}</div>)}</div>; }
function DonutChart() { return <div className="donut-chart"><div className="donut-hole"><strong>246</strong><span>total</span></div></div>; }
function StatusRow({ color, label, value, percent }: { color: string; label: string; value: string; percent: string }) { return <div className="status-row"><i className={`status-dot ${color}`} /><span>{label}</span><strong>{value}</strong><small>{percent}</small></div>; }
function Variable({ icon: Icon, label, value, accent = false }: { icon: typeof CalendarDays; label: string; value: string; accent?: boolean }) { return <div className="variable"><span className="variable-icon"><Icon size={15} /></span><span>{label}</span><strong className={accent ? 'accent-text' : ''}>{value}</strong></div>; }
function AlertRow({ icon: Icon, tone, text }: { icon: typeof AlertTriangle; tone: string; text: string }) { return <div className={`alert-row ${tone}`}><Icon size={17} /><span>{text}</span><ChevronDown size={15} /></div>; }
function NewOrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: (order: NewOrder) => Promise<boolean> }) {
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState('Delivery');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [selectedProduct, setSelectedProduct] = useState(products[0].id);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addProduct = () => {
    const product = products.find((item) => item.id === selectedProduct);
    if (!product) return;
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);
      if (existingItem) return currentCart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const changeQuantity = (productId: string, amount: number) => {
    setCart((currentCart) => currentCart.flatMap((item) => {
      if (item.id !== productId) return [item];
      const quantity = item.quantity + amount;
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage('');
    const saved = await onSaved({ customerName: customer, phone, address, deliveryType, paymentMethod, items: cart, total });
    if (saved) onClose();
    else setErrorMessage('No se pudo guardar el pedido. Intenta nuevamente.');
    setSaving(false);
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal order-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">Nuevo registro</span><h2>Registrar pedido</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="order-modal-grid"><div><label>Cliente</label><div className="input-with-icon"><UserRound size={17} /><input autoFocus placeholder="Nombre del cliente" value={customer} onChange={(event) => setCustomer(event.target.value)} /></div><label>Teléfono</label><div className="input-with-icon"><Phone size={17} /><input placeholder="999 999 999" value={phone} onChange={(event) => setPhone(event.target.value)} /></div><label>Dirección de entrega</label><div className="input-with-icon"><MapPin size={17} /><input placeholder="Av. Principal 123" value={address} onChange={(event) => setAddress(event.target.value)} /></div><div className="modal-grid"><div><label>Tipo de entrega</label><select value={deliveryType} onChange={(event) => setDeliveryType(event.target.value)}><option>Delivery</option><option>Recojo en tienda</option></select></div><div><label>Pago</label><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Efectivo</option><option>Yape / Plin</option><option>Tarjeta</option></select></div></div></div><div className="cart-panel"><div className="cart-heading"><div><span className="eyebrow">Detalle de compra</span><h3>Carrito <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></h3></div><ShoppingBag size={20} /></div><div className="product-picker"><select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · S/ {product.price.toFixed(2)}</option>)}</select><button className="primary-button add-product" onClick={addProduct}><Plus size={16} /> Añadir</button></div><div className="cart-items">{cart.length === 0 ? <div className="empty-cart"><ShoppingBag size={25} /><span>Selecciona un producto para comenzar</span></div> : cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-item-copy"><strong>{item.name}</strong><span>S/ {item.price.toFixed(2)} c/u</span></div><div className="quantity-control"><button onClick={() => changeQuantity(item.id, -1)} aria-label={`Disminuir ${item.name}`}><Minus size={13} /></button><strong>{item.quantity}</strong><button onClick={() => changeQuantity(item.id, 1)} aria-label={`Aumentar ${item.name}`}><Plus size={13} /></button></div><strong className="cart-item-total">S/ {(item.price * item.quantity).toFixed(2)}</strong><button className="remove-item" onClick={() => setCart((currentCart) => currentCart.filter((cartItem) => cartItem.id !== item.id))} aria-label={`Eliminar ${item.name}`}><X size={15} /></button></div>)}</div><div className="cart-total"><span>Total del pedido</span><strong>S/ {total.toFixed(2)}</strong></div></div></div>{errorMessage && <p className="form-error">{errorMessage}</p>}<button className="primary-button modal-submit" onClick={handleSave} disabled={saving || !customer.trim() || cart.length === 0}><Check size={17} /> {saving ? 'Guardando…' : 'Guardar pedido'}</button></div></div>;
}

export default App;
