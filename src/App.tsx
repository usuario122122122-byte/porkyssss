import { useCallback, useEffect, useState, type ReactNode } from 'react';

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bike,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  UtensilsCrossed,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  MapPin,
  Menu,
  Minus,
  MoreVertical,
  Phone,
  Plus,
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
type UserRole = 'admin' | 'empleado' | 'repartidor' | 'cliente';
type UserProfile = { id: string; nombre: string; apellido: string; rol: UserRole; activo: boolean };
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
  id: number;
  name: string;
  price: number;
  category: string;
};

type CartItem = Product & { quantity: number };
type NewOrder = { customerName: string; phone: string; address: string; items: CartItem[]; total: number };
type ForecastPoint = { date: string; hour: number; linear_regression: number; knn: number; recommended: number };
const PREDICTION_API = (import.meta.env.VITE_PREDICTION_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
type OrderStats = { received: number; pending: number; preparing: number; delivered: number; inTransit: number };


function App() {
  const [view, setView] = useState<View>('overview');
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'Todos' | OrderStatus>('Todos');
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, nombre, apellido, rol, activo')
      .eq('id', userId)
      .single();
    if (error) throw new Error(`No se pudo cargar tu perfil: ${error.message}`);
    if (!data) throw new Error('Tu usuario no tiene un perfil registrado.');
    if (!data.activo) throw new Error('Tu cuenta está desactivada. Contacta con el administrador.');
    if (!['admin', 'empleado', 'repartidor', 'cliente'].includes(data.rol)) throw new Error('Tu cuenta tiene un rol no reconocido.');
    setProfile(data as UserProfile);
    setSignedIn(true);
  };

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Error recuperando sesión:', error);
      if (data.session?.user && mounted) {
        try { await loadProfile(data.session.user.id); }
        catch (profileError) {
          console.error(profileError);
          await supabase.auth.signOut();
          if (mounted) setAuthError(profileError instanceof Error ? profileError.message : 'No se pudo cargar el perfil.');
        }
      }
      if (mounted) setAuthLoading(false);
    };
    void restoreSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setProfile(null); setSignedIn(false); }
    });
    return () => { mounted = false; authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!signedIn || !profile) return;
    const loadData = async () => {
      const { data: productData, error: productError } = await supabase
        .from('producto').select('id_producto, nombre, precio, disponible')
        .eq('disponible', true).order('nombre');
      if (productError) console.error('Error cargando productos:', productError);
      else setProducts((productData ?? []).map((p) => ({ id: Number(p.id_producto), name: p.nombre, price: Number(p.precio), category: 'Producto' })));

      const { data: orderData, error: orderError } = await supabase
        .from('pedido').select('id_pedido, fecha_hora, estado, total, id_cliente')
        .order('fecha_hora', { ascending: false });
      if (orderError) { console.error('Error cargando pedidos:', orderError); return; }
      const savedOrders: Order[] = await Promise.all((orderData ?? []).map(async (order) => {
        const [{ data: customer }, { data: details }] = await Promise.all([
          supabase.from('cliente').select('nombre, apellido').eq('id_cliente', order.id_cliente).maybeSingle(),
          supabase.from('detalle_pedido').select('cantidad, id_producto').eq('id_pedido', order.id_pedido),
        ]);
        const ids = (details ?? []).map((detail) => detail.id_producto);
        const { data: detailProducts } = ids.length
          ? await supabase.from('producto').select('id_producto, nombre').in('id_producto', ids)
          : { data: [] };
        const names = (details ?? []).map((detail) => {
          const product = detailProducts?.find((item) => item.id_producto === detail.id_producto);
          return `${detail.cantidad}x ${product?.nombre ?? 'Producto'}`;
        });
        return {
          id: `PED-${order.id_pedido}`,
          customer: customer ? `${customer.nombre} ${customer.apellido}` : 'Cliente',
          time: new Date(order.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          products: names.join(', '), total: `S/ ${Number(order.total).toFixed(2)}`,
          status: order.estado as OrderStatus, delivery: 'Sin asignar',
        };
      }));
      setOrderList(savedOrders);
    };
    void loadData();
  }, [signedIn, profile]);

   const handleLogin = async () => {
    setLoginLoading(true); setAuthError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!data.user) throw new Error('Supabase no devolvió un usuario autenticado.');
      await loadProfile(data.user.id);
      setPassword('');
    } catch (error) {
      console.error('Error iniciando sesión:', error);
      setAuthError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
      await supabase.auth.signOut();
    } finally { setLoginLoading(false); setAuthLoading(false); }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { setAuthError(`No se pudo cerrar sesión: ${error.message}`); return; }
    setProfile(null); setSignedIn(false); setPassword('');
  };

  if (authLoading) return <div className="login-screen"><section className="login-panel"><p>Comprobando sesión…</p></section></div>;
  if (!signedIn || !profile) {
    return <LoginScreen email={email} password={password} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={handleLogin} loading={loginLoading} error={authError} />;
  }

  const filteredOrders = orderFilter === 'Todos' ? orderList : orderList.filter((order) => order.status === orderFilter);

  const stats: OrderStats = { received: orderList.length, pending: orderList.filter((order) => order.status === 'Pendiente').length, preparing: orderList.filter((order) => order.status === 'En preparación').length, delivered: orderList.filter((order) => order.status === 'Entregado').length, inTransit: orderList.filter((order) => order.status === 'En camino').length };

  const saveOrder = async (newOrder: NewOrder) => {
    try {
      const nameParts = newOrder.customerName.trim().split(/\s+/);
      const { data, error } = await supabase.rpc('registrar_pedido', {
        p_nombre: nameParts[0],
        p_apellido: nameParts.slice(1).join(' ') || 'Sin apellido',
        p_telefono: newOrder.phone.trim(),
        p_direccion: newOrder.address.trim(),
        p_items: newOrder.items.map((item) => ({
          id_producto: item.id,
          cantidad: item.quantity,
          precio_unitario: item.price,
        })),
      });
      if (error) throw error;
      const created = Array.isArray(data) ? data[0] : data;
      if (!created) throw new Error('Supabase no devolvió el pedido creado.');

      const savedOrder: Order = {
        id: `PED-${created.id_pedido}`,
        customer: newOrder.customerName.trim(),
        time: new Date(created.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        products: newOrder.items.map((item) => `${item.quantity}x ${item.name}`).join(', '),
        total: `S/ ${Number(created.total).toFixed(2)}`,
        status: 'Pendiente',
        delivery: 'Sin asignar',
      };
      setOrderList((current) => [savedOrder, ...current]);
      return true;
    } catch (error) {
      console.error('Error guardando pedido:', error);
      return false;
    }
  };

  const updateOrderStatus = async (orderCode: string, status: OrderStatus) => {
    const id = Number(orderCode.replace('PED-', ''));
    if (!Number.isInteger(id)) return;
    const { error } = await supabase.from('pedido').update({ estado: status }).eq('id_pedido', id);
    if (error) {
      console.error('Error actualizando estado:', error);
      window.alert(`No se pudo actualizar el pedido: ${error.message}`);
      return;
    }
    setOrderList((current) => current.map((order) => order.id === orderCode ? { ...order, status } : order));
  };

  return (
    <div className="app-shell">
      <Sidebar view={view} onChange={setView} />
      <main className="main-content">
        <Topbar profile={profile} onSignOut={handleSignOut} />
        <div className="page-content">
          {view === 'overview' && <Overview stats={stats} rows={orderList} onNewOrder={() => setShowNewOrder(true)} onViewOrders={() => setView('orders')} />}
          {view === 'orders' && (
            <OrdersView
              orders={filteredOrders}
              stats={stats}
              filter={orderFilter}
              onFilterChange={setOrderFilter}
              onNewOrder={() => setShowNewOrder(true)}
              onStatusChange={updateOrderStatus}
            />
          )}

          {view === 'demand' && <DemandView />}
          {view === 'deliveries' && <DeliveriesView orders={orderList} />}
        </div>
      </main>
      {showNewOrder && <NewOrderModal products={products} onClose={() => setShowNewOrder(false)} onSaved={saveOrder} />}
    </div>
  );

}

function LoginScreen({ email, password, onEmailChange, onPasswordChange, onSubmit, loading, error }: { email: string; password: string; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onSubmit: () => void; loading: boolean; error: string }) {
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
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button login-button" type="submit" disabled={loading}><LogIn size={18} /> {loading ? 'Ingresando…' : 'Ingresar'}</button>
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

function Topbar({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const fullName = `${profile.nombre} ${profile.apellido}`.trim();
  const initials = `${profile.nombre.charAt(0)}${profile.apellido.charAt(0)}`.toUpperCase();
  const roleLabel: Record<UserRole, string> = { admin: 'Administrador', empleado: 'Empleado', repartidor: 'Repartidor', cliente: 'Cliente' };
  return <header className="topbar"><div className="mobile-menu"><Menu size={21} /></div><div className="breadcrumb"><span>Operaciones</span><b>/</b><strong>Panel de control</strong></div><div className="topbar-actions"><button className="icon-button notification"><Bell size={18} /><i>3</i></button><button className="profile-button" onClick={onSignOut} title="Cerrar sesión"><span className="avatar">{initials}</span><span><strong>{fullName}</strong><small>{roleLabel[profile.rol]} · Cerrar sesión</small></span><ChevronDown size={15} /></button></div></header>;
}


function Overview({ stats, rows, onNewOrder, onViewOrders }: { stats: OrderStats; rows: Order[]; onNewOrder: () => void; onViewOrders: () => void }) {
  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  const statusData = [
    { label: 'Pendientes', value: stats.pending, color: '#b52d32' },
    { label: 'En preparación', value: stats.preparing, color: '#4b8bd5' },
    { label: 'En camino', value: stats.inTransit, color: '#e9ad45' },
    { label: 'Entregados', value: stats.delivered, color: '#62ad59' },
  ];

  const totalStatus = statusData.reduce((sum, item) => sum + item.value, 0);
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = statusData.map((item) => {
    const length = totalStatus ? (item.value / totalStatus) * circumference : 0;
    const segment = { ...item, length, offset };
    offset += length;
    return segment;
  });

  const dailyData = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));

    const count = rows.filter((order) => {
      const created = new Date(order.createdAt);
      return created.getFullYear() === day.getFullYear()
        && created.getMonth() === day.getMonth()
        && created.getDate() === day.getDate();
    }).length;

    return {
      label: day.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''),
      count,
      key: day.toISOString(),
    };
  });

  const maxDaily = Math.max(1, ...dailyData.map((item) => item.count));

  return (
    <>
      <PageHeading
        eyebrow={today}
        title="Resumen operativo"
        subtitle="Indicadores calculados a partir de los pedidos registrados."
        action={
          <>
            <button className="secondary-button" onClick={onViewOrders}>
              <ShoppingBag size={16} /> Ver pedidos
            </button>
            <button className="primary-button" onClick={onNewOrder}>
              <Plus size={16} /> Registrar pedido
            </button>
          </>
        }
      />

      <div className="metric-grid">
        <MetricCard label="Pedidos registrados" value={String(stats.received)} trend="Total cargado" icon={ShoppingBag} tone="red" />
        <MetricCard label="Pedidos pendientes" value={String(stats.pending)} trend="Requieren atención" icon={Clock3} tone="amber" />
        <MetricCard label="En preparación" value={String(stats.preparing)} trend="En cocina" icon={UtensilsCrossed} tone="blue" />
        <MetricCard label="En camino" value={String(stats.inTransit)} trend="En reparto" icon={Bike} tone="green" />
      </div>

      <div
        className="overview-grid"
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(280px, 1fr)',
          gap: 16,
        }}
      >
        {/* Gráfico de pedidos de los últimos 7 días */}
        <section className="panel" style={{ padding: 20, minWidth: 0 }}>
          <PanelHeading title="Pedidos de los últimos 7 días" action="Datos reales" />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#929292',
            fontSize: 12,
            margin: '12px 0 4px',
          }}>
            <span>Pedidos por día</span>
            <strong style={{ color: '#6b3030' }}>
              {dailyData.reduce((sum, item) => sum + item.count, 0)} esta semana
            </strong>
          </div>

          <svg viewBox="0 0 380 140" role="img" aria-label="Pedidos por día durante los últimos siete días" style={{ width: '100%' }}>
            <line x1="15" y1="105" x2="365" y2="105" stroke="#eeeeee" />
            <line x1="15" y1="65" x2="365" y2="65" stroke="#f2f2f2" strokeDasharray="4 4" />
            <line x1="15" y1="25" x2="365" y2="25" stroke="#f2f2f2" strokeDasharray="4 4" />

            <polyline
              points={dailyData.map((item, index) => {
                const x = 24 + index * 55;
                const y = 105 - (item.count / maxDaily) * 78;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#b52d32"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {dailyData.map((item, index) => {
              const x = 24 + index * 55;
              const y = 105 - (item.count / maxDaily) * 78;

              return (
                <g key={item.key}>
                  <circle cx={x} cy={y} r="4" fill="#b52d32" />
                  <text x={x} y="128" textAnchor="middle" fontSize="10" fill="#929292">
                    {item.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>

        {/* Gráfico circular de estados */}
        <section className="panel" style={{ padding: 20 }}>
          <PanelHeading title="Estado de pedidos" action="Distribución actual" />

          {totalStatus === 0 ? (
            <p style={{ color: '#8b8b8b', padding: '28px 0' }}>
              No hay pedidos registrados.
            </p>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              gap: 18,
              flexWrap: 'wrap',
              padding: '12px 0',
            }}>
              <div style={{ position: 'relative', width: 142, height: 142, flex: '0 0 142px' }}>
                <svg viewBox="0 0 120 120" width="142" height="142" role="img" aria-label="Distribución de estados de pedidos">
                  <circle cx="60" cy="60" r={radius} fill="none" stroke="#eeeeee" strokeWidth="16" />

                  {segments.map((segment) => (
                    <circle
                      key={segment.label}
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="16"
                      strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                      strokeDashoffset={-segment.offset}
                      transform="rotate(-90 60 60)"
                    />
                  ))}
                </svg>

                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeContent: 'center',
                  textAlign: 'center',
                }}>
                  <strong style={{ fontSize: 23, color: '#542d2d' }}>{totalStatus}</strong>
                  <span style={{ fontSize: 10, color: '#999' }}>pedidos</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 11, minWidth: 130 }}>
                {statusData.map((item) => (
                  <div key={item.label} style={{
                    display: 'grid',
                    gridTemplateColumns: '10px 1fr auto',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: '#777',
                  }}>
                    <span style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: item.color,
                    }} />
                    <span>{item.label}</span>
                    <strong style={{ color: '#4b4141' }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Tabla de pedidos recientes */}
      <section className="panel full-panel" style={{ marginTop: 20 }}>
        <PanelHeading
          title="Pedidos recientes"
          action={<button className="panel-action" onClick={onViewOrders}>Ver todos</button>}
        />
        {rows.length ? (
          <OrderTable rows={rows.slice(0, 8)} compact />
        ) : (
          <p>Aún no hay pedidos registrados. Utiliza «Registrar pedido» para crear el primero.</p>
        )}
      </section>
    </>
  );
}


function OrdersView({ orders: visibleOrders, stats, filter, onFilterChange, onNewOrder, onStatusChange }: { orders: Order[]; stats: OrderStats; filter: 'Todos' | OrderStatus; onFilterChange: (filter: 'Todos' | OrderStatus) => void; onNewOrder: () => void; onStatusChange: (id: string, status: OrderStatus) => Promise<void> }) {
  return <>
    <PageHeading eyebrow="Operaciones / Pedidos" title="Gestión de pedidos" subtitle="Registra, organiza y actualiza el estado de cada solicitud." action={<button className="primary-button" onClick={onNewOrder}><Plus size={16} /> Registrar pedido</button>} />
    <div className="metric-grid four">
      <MetricCard label="Recibidos" value={String(stats.received)} trend="Total registrado" icon={ShoppingBag} tone="red" />
      <MetricCard label="Pendientes" value={String(stats.pending)} trend="Por atender" icon={Clock3} tone="amber" />
      <MetricCard label="En preparación" value={String(stats.preparing)} trend="En cocina" icon={UtensilsCrossed} tone="blue" />
      <MetricCard label="Entregados" value={String(stats.delivered)} trend="Completados" icon={Check} tone="green" />
    </div>
    <section className="panel full-panel" style={{ marginTop: 20 }}>
      <div className="table-toolbar"><div className="filter-group"><Filter size={15} />{(['Todos', 'Pendiente', 'En preparación', 'En camino', 'Entregado'] as const).map((option) => <button key={option} className={filter === option ? 'filter-option active' : 'filter-option'} onClick={() => onFilterChange(option)}>{option}</button>)}</div></div>
      {visibleOrders.length ? <OrderTable rows={visibleOrders} onStatusChange={onStatusChange} /> : <p>No hay pedidos para mostrar con este filtro.</p>}
    </section>
  </>;
}


function DemandView() {
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [summary, setSummary] = useState<{ total_knn: number; total_linear_regression: number; peak_hour: number; peak_demand: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [promotion, setPromotion] = useState(false);
  const [temperature, setTemperature] = useState('22');
  const [rain, setRain] = useState(false);
  const [holiday, setHoliday] = useState(false);

  const runForecast = useCallback(async () => {
    setLoading(true); setError(''); setSavedMessage('');
    try {
      const now = new Date();
      const response = await fetch(`${PREDICTION_API}/forecast`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, start_hour: now.getHours(), horizon: 24,
          promotion, temperature: Number(temperature), rain, holiday,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `La API respondió ${response.status}`);
      }
      const result = await response.json();
      setForecast(result.predictions);
      setSummary(result.summary);

      const rows = result.predictions.map((point: ForecastPoint) => ({
        periodo_predicho: `${point.date}T${String(point.hour).padStart(2, '0')}:00:00`,
        cantidad_estimada: point.knn,
      }));
      const { error: saveError } = await supabase.rpc('guardar_predicciones', {
        p_algoritmo: 'KNN (K=7, distancia)', p_predicciones: rows,
      });
      if (saveError) throw new Error(`Pronóstico generado, pero no se pudo guardar en Supabase: ${saveError.message}`);
      setSavedMessage('Pronóstico KNN guardado en el historial de predicciones.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el pronóstico.');
    } finally { setLoading(false); }
  }, [promotion, temperature, rain, holiday]);

  useEffect(() => { void runForecast(); }, [runForecast]);
  const peakLabel = summary ? `${String(summary.peak_hour).padStart(2, '0')}:00` : '—';
  return <>
    <PageHeading eyebrow="Análisis inteligente" title="Predicción de demanda" subtitle="Pronóstico horario generado por los modelos entrenados con datos sintéticos." action={<button className="primary-button" onClick={() => void runForecast()} disabled={loading}><Sparkles size={16} /> {loading ? 'Calculando…' : 'Actualizar predicción'}</button>} />
    <section className="panel variables-panel" style={{ marginBottom: 20 }}>
      <PanelHeading title="Variables de simulación" action="Entrada del modelo" />
      <div className="modal-grid">
        <label><input type="checkbox" checked={promotion} onChange={(e) => setPromotion(e.target.checked)} /> Promoción activa</label>
        <label>Temperatura (°C)<input type="number" min="-10" max="50" value={temperature} onChange={(e) => setTemperature(e.target.value)} /></label>
        <label><input type="checkbox" checked={rain} onChange={(e) => setRain(e.target.checked)} /> Lluvia</label>
        <label><input type="checkbox" checked={holiday} onChange={(e) => setHoliday(e.target.checked)} /> Feriado</label>
      </div>
    </section>
    {error && <p className="form-error">{error} Comprueba que FastAPI esté ejecutándose en {PREDICTION_API}.</p>}
    {savedMessage && <p className="success-message">{savedMessage}</p>}
    <div className="metric-grid four">
      <MetricCard label="Pedidos estimados (KNN)" value={summary ? String(Math.round(summary.total_knn)) : '—'} trend="Próximas 24 horas" icon={ShoppingBag} tone="red" />
      <MetricCard label="Hora pico esperada" value={peakLabel} trend="Según KNN" icon={Clock3} tone="amber" />
      <MetricCard label="Pico de demanda" value={summary ? String(Math.round(summary.peak_demand)) : '—'} trend="Pedidos estimados/hora" icon={TrendingUp} tone="green" />
      <MetricCard label="Modelo recomendado" value="KNN" trend="7 vecinos · distancia" icon={Target} tone="blue" />
    </div>
    <section className="panel full-panel" style={{ marginTop: 20 }}>
      <PanelHeading title="Pronóstico por hora" action="KNN vs. Regresión lineal" />
      <p>Los resultados son una simulación académica y no representan datos reales de una empresa.</p>
      <div className="orders-table">
        <div className="order-row order-head"><span>Fecha</span><span>Hora</span><span>KNN</span><span>Regresión lineal</span><span>Modelo recomendado</span></div>
        {forecast.map((point) => <div className="order-row" key={`${point.date}-${point.hour}`}><span>{point.date}</span><strong>{String(point.hour).padStart(2, '0')}:00</strong><span>{point.knn.toFixed(1)}</span><span>{point.linear_regression.toFixed(1)}</span><strong>{point.recommended.toFixed(1)}</strong></div>)}
        {!forecast.length && !loading && <p>No hay pronósticos disponibles. Pulsa «Actualizar predicción».</p>}
      </div>
    </section>
  </>;
}

function DeliveriesView({ orders }: { orders: Order[] }) {
  const active = orders.filter((order) => order.status === 'En camino');
  return <>
    <PageHeading eyebrow="Operaciones / Logística" title="Seguimiento de entregas" subtitle="Pedidos que actualmente figuran como En camino." />
    <div className="metric-grid four"><MetricCard label="Entregas activas" value={String(active.length)} trend="Según pedidos registrados" icon={Bike} tone="green" positive /><MetricCard label="Sin asignar" value={String(active.filter((order) => order.delivery === 'Sin asignar').length)} trend="Requieren repartidor" icon={Users} tone="amber" /></div>
    <section className="panel full-panel" style={{ marginTop: 20 }}><PanelHeading title="Pedidos en reparto" action="Datos de Supabase" />{active.length ? <OrderTable rows={active} /> : <p>No hay pedidos en camino actualmente. Actualiza el estado de un pedido desde Gestión de pedidos.</p>}</section>
  </>;
}


function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div><div className="heading-actions">{action}</div></div>; }
function MetricCard({ label, value, trend, icon: Icon, tone, positive }: { label: string; value: string; trend: string; icon: typeof ShoppingBag; tone: string; positive?: boolean }) { return <article className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={20} /></div><div className="metric-info"><span>{label}</span><strong>{value}</strong><small className={positive ? 'positive' : ''}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trend}</small></div></article>; }
function PanelHeading({ title, action, onAction }: { title: string; action?: ReactNode; onAction?: () => void }) { return <div className="panel-heading"><h2>{title}</h2>{typeof action === 'string' ? <button className="panel-action" onClick={onAction}>{action}</button> : <span className="panel-action-label">{action}</span>}</div>; }
function StatusBadge({ status, label }: { status: OrderStatus; label?: string }) { return <span className={`status-badge ${status.toLowerCase().replace(/ /g, '-')}`}>{label || status}</span>; }
function OrderTable({ rows, compact = false, onStatusChange }: { rows: Order[]; compact?: boolean; onStatusChange?: (id: string, status: OrderStatus) => Promise<void> }) { return <div className={`orders-table ${compact ? 'compact' : ''}`}><div className="order-row order-head"><span>Código de pedido</span><span>Cliente</span><span>Hora</span><span>Productos</span><span>Estado</span><span>Repartidor</span><span /></div>{rows.map((order) => <div className="order-row" key={order.id}><strong>{order.id}</strong><span>{order.customer}</span><span>{order.time}</span><span className="product-cell">{order.products}</span><span>{onStatusChange ? <select aria-label={`Estado ${order.id}`} value={order.status} onChange={(event) => void onStatusChange(order.id, event.target.value as OrderStatus)}><option>Pendiente</option><option>En preparación</option><option>En camino</option><option>Entregado</option></select> : <StatusBadge status={order.status} />}</span><span>{order.delivery}</span><button className="icon-button"><MoreVertical size={16} /></button></div>)}</div>; }
function NewOrderModal({ products, onClose, onSaved }: { products: Product[]; onClose: () => void; onSaved: (order: NewOrder) => Promise<boolean> }) {
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
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

  const changeQuantity = (productId: number, amount: number) => {
    setCart((currentCart) => currentCart.flatMap((item) => {
      if (item.id !== productId) return [item];
      const quantity = item.quantity + amount;
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage('');
    const saved = await onSaved({ customerName: customer, phone, address, items: cart, total });
    if (saved) onClose();
    else setErrorMessage('No se pudo guardar el pedido. Intenta nuevamente.');
    setSaving(false);
  };

  return <div className="modal-backdrop" onClick={onClose}><div className="modal order-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">Nuevo registro</span><h2>Registrar pedido</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="order-modal-grid"><div><label>Cliente</label><div className="input-with-icon"><UserRound size={17} /><input autoFocus placeholder="Nombre del cliente" value={customer} onChange={(event) => setCustomer(event.target.value)} /></div><label>Teléfono</label><div className="input-with-icon"><Phone size={17} /><input placeholder="999 999 999" value={phone} onChange={(event) => setPhone(event.target.value)} /></div><label>Dirección de entrega</label><div className="input-with-icon"><MapPin size={17} /><input placeholder="Av. Principal 123" value={address} onChange={(event) => setAddress(event.target.value)} /></div></div><div className="cart-panel"><div className="cart-heading"><div><span className="eyebrow">Detalle de compra</span><h3>Carrito <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></h3></div><ShoppingBag size={20} /></div><div className="product-picker"><select value={selectedProduct ?? ''} onChange={(event) => setSelectedProduct(Number(event.target.value))}>
    <option value="" disabled>Seleccionar producto</option>
    {products.map((product) => <option key={product.id} value={product.id}>{product.name} · S/ {product.price.toFixed(2)}</option>)}
  </select><button className="primary-button add-product" onClick={addProduct}><Plus size={16} /> Añadir</button></div><div className="cart-items">{cart.length === 0 ? <div className="empty-cart"><ShoppingBag size={25} /><span>Selecciona un producto para comenzar</span></div> : cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-item-copy"><strong>{item.name}</strong><span>S/ {item.price.toFixed(2)} c/u</span></div><div className="quantity-control"><button onClick={() => changeQuantity(item.id, -1)} aria-label={`Disminuir ${item.name}`}><Minus size={13} /></button><strong>{item.quantity}</strong><button onClick={() => changeQuantity(item.id, 1)} aria-label={`Aumentar ${item.name}`}><Plus size={13} /></button></div><strong className="cart-item-total">S/ {(item.price * item.quantity).toFixed(2)}</strong><button className="remove-item" onClick={() => setCart((currentCart) => currentCart.filter((cartItem) => cartItem.id !== item.id))} aria-label={`Eliminar ${item.name}`}><X size={15} /></button></div>)}</div><div className="cart-total"><span>Total del pedido</span><strong>S/ {total.toFixed(2)}</strong></div></div></div>{errorMessage && <p className="form-error">{errorMessage}</p>}<button className="primary-button modal-submit" onClick={handleSave} disabled={saving || !customer.trim() || cart.length === 0}><Check size={17} /> {saving ? 'Guardando…' : 'Guardar pedido'}</button></div></div>;
}

export default App;
