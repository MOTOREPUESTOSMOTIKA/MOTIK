let productos = JSON.parse(localStorage.getItem('productos')) || [];
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let encargos = JSON.parse(localStorage.getItem('encargos')) || [];

function showSection(sectionId) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}

// --- INVENTARIO ---
const formProducto = document.getElementById('form-producto');
if (formProducto) {
    formProducto.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('prod-nombre').value.trim();
        const cantidad = parseInt(document.getElementById('prod-cantidad').value);
        const costo = parseFloat(document.getElementById('prod-costo').value);
        const precio = parseFloat(document.getElementById('prod-precio').value);

        const existente = productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
        if (existente) {
            existente.cantidad += cantidad;
            existente.costo = costo;
            existente.precio = precio;
            existente.utilidad = precio - costo;
        } else {
            productos.push({ id: Date.now(), nombre, cantidad, costo, precio, utilidad: precio - costo });
        }
        actualizarTodo();
        formProducto.reset();
    });
}

function actualizarInventario() {
    localStorage.setItem('productos', JSON.stringify(productos));
    const tabla = document.getElementById('tabla-inventario');
    if (!tabla) return;
    tabla.innerHTML = '';
    let inv = 0, ven = 0, gan = 0;
    productos.forEach(p => {
        inv += (p.costo * p.cantidad); ven += (p.precio * p.cantidad); gan += (p.utilidad * p.cantidad);
        tabla.innerHTML += `<tr><td>${p.nombre}</td><td>${p.cantidad}</td><td>$${p.costo.toFixed(2)}</td><td>$${p.precio.toFixed(2)}</td><td><button onclick="eliminarProducto(${p.id})">Eliminar</button></td></tr>`;
    });
    document.getElementById('total-costo-inv').innerText = `$${inv.toFixed(2)}`;
    document.getElementById('total-venta-inv').innerText = `$${ven.toFixed(2)}`;
    document.getElementById('total-ganancia-inv').innerText = `$${gan.toFixed(2)}`;
}

// --- FINANZAS ---
function toggleProductoSelector() {
    const tipo = document.getElementById('trans-tipo').value;
    document.getElementById('select-producto').style.display = (tipo === 'venta') ? 'inline-block' : 'none';
    document.getElementById('trans-cantidad').style.display = (tipo === 'venta') ? 'inline-block' : 'none';
}

const formTransaccion = document.getElementById('form-transaccion');
if (formTransaccion) {
    formTransaccion.addEventListener('submit', function(e) {
        e.preventDefault();
        const tipo = document.getElementById('trans-tipo').value;
        const monto = parseFloat(document.getElementById('trans-monto').value);
        let desc = document.getElementById('trans-desc').value;

        if (tipo === 'venta') {
            const prodId = document.getElementById('select-producto').value;
            const cant = parseInt(document.getElementById('trans-cantidad').value);
            const p = productos.find(x => x.id == prodId);
            if (!p || p.cantidad < cant) return alert("Stock insuficiente");
            p.cantidad -= cant;
            transacciones.push({ id: Date.now(), tipo: 'ingreso', desc: `Venta: ${cant}x ${p.nombre}`, monto: p.precio * cant, fecha: new Date().toISOString().split('T')[0] });
        } else {
            transacciones.push({ id: Date.now(), tipo: tipo, desc: desc, monto: monto, fecha: new Date().toISOString().split('T')[0] });
        }
        actualizarTodo();
        this.reset();
    });
}

const formGastos = document.getElementById('form-gastos-diarios');
if (formGastos) {
    formGastos.addEventListener('submit', function(e) {
        e.preventDefault();
        const cat = document.getElementById('gasto-categoria').value;
        const monto = parseFloat(document.getElementById('gasto-monto').value);
        const fecha = document.getElementById('gasto-fecha').value;
        const desc = document.getElementById('gasto-desc').value;

        transacciones.push({ id: Date.now(), tipo: 'gasto', desc: `[${cat}] ${desc}`, monto: monto, fecha: fecha });
        actualizarTodo();
        this.reset();
    });
}

function actualizarFinanzas() {
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    const lista = document.getElementById('lista-transacciones');
    const filtro = document.getElementById('filtro-fecha-finanzas').value;
    if (!lista) return;
    lista.innerHTML = '';
    let tIng = 0, tGas = 0, vDia = 0;
    transacciones.forEach(t => {
        if (t.tipo === 'ingreso') tIng += t.monto; else tGas += t.monto;
        if (filtro && t.fecha === filtro) {
            if (t.tipo === 'ingreso') vDia += t.monto;
            lista.innerHTML += `<li>${t.desc} - $${t.monto.toFixed(2)}</li>`;
        } else if (!filtro) {
            lista.innerHTML += `<li>${t.desc} - $${t.monto.toFixed(2)}</li>`;
        }
    });
    document.getElementById('total-ganancias').innerText = `$${tIng.toFixed(2)}`;
    document.getElementById('total-gastos').innerText = `$${tGas.toFixed(2)}`;
    document.getElementById('balance-final').innerText = `$${(tIng - tGas).toFixed(2)}`;
    document.getElementById('total-dia-filtro').innerText = `$${vDia.toFixed(2)}`;
}

// --- ENCARGOS ---
function agregarFila() {
    const div = document.createElement('div');
    div.className = 'fila-producto';
    div.innerHTML = `<input type="text" placeholder="Producto" class="p-nombre" required><input type="number" placeholder="Cant." class="p-cant" style="max-width: 80px;" required><button type="button" onclick="this.parentElement.remove()">-</button>`;
    document.getElementById('contenedor-filas-productos').appendChild(div);
}

const formEncargo = document.getElementById('form-encargo');
if (formEncargo) {
    formEncargo.addEventListener('submit', function(e) {
        e.preventDefault();
        const filas = document.querySelectorAll('.fila-producto');
        let prods = [];
        filas.forEach(f => prods.push({ nombre: f.querySelector('.p-nombre').value, cant: f.querySelector('.p-cant').value }));
        encargos.push({ id: Date.now(), cliente: document.getElementById('enc-cliente').value, productos: prods, abono: parseFloat(document.getElementById('enc-abono').value), estado: document.getElementById('enc-pagado').checked ? "PAGADO" : "PENDIENTE", fecha: new Date().toLocaleDateString() });
        actualizarTodo();
        this.reset();
        document.getElementById('contenedor-filas-productos').innerHTML = `<div class="fila-producto"><input type="text" placeholder="Producto" class="p-nombre" required><input type="number" placeholder="Cant." class="p-cant" style="max-width: 80px;" required><button type="button" onclick="agregarFila()">+</button></div>`;
    });
}

function actualizarVistaEncargos() {
    localStorage.setItem('encargos', JSON.stringify(encargos));
    const cont = document.getElementById('lista-pedidos-clientes');
    if (!cont) return;
    cont.innerHTML = '';
    encargos.forEach(p => {
        const items = p.productos.map(i => `<li>${i.cant}x ${i.nombre}</li>`).join('');
        cont.innerHTML += `<div class="card-resaltada"><strong>👤 ${p.cliente}</strong><ul>${items}</ul><p>Abono: $${p.abono} | ${p.estado}</p><button onclick="eliminarPedido(${p.id})">Eliminar</button></div>`;
    });
}

function calcularGastosOperativos() {
    const filtro = document.getElementById('filtro-fecha-gasto').value;
    let s=0, t=0, o=0;
    transacciones.filter(tr => tr.tipo === 'gasto' && tr.fecha === filtro).forEach(tr => {
        if (tr.desc.includes('Surtido')) s+=tr.monto; else if (tr.desc.includes('Transporte')) t+=tr.monto; else o+=tr.monto;
    });
    document.getElementById('total-gasto-dia-surtido').innerText = `$${(s+t+o).toFixed(2)}`;
    document.getElementById('det-surtido').innerText = `$${s.toFixed(2)}`;
    document.getElementById('det-transp').innerText = `$${t.toFixed(2)}`;
    document.getElementById('det-otros').innerText = `$${o.toFixed(2)}`;
}

function eliminarProducto(id) { productos = productos.filter(p => p.id !== id); actualizarTodo(); }
function eliminarPedido(id) { encargos = encargos.filter(p => p.id !== id); actualizarTodo(); }

function actualizarTodo() {
    actualizarInventario(); actualizarFinanzas(); actualizarVistaEncargos();
    const sel = document.getElementById('select-producto');
    if (sel) {
        sel.innerHTML = '<option value="">Seleccionar...</option>';
        productos.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.nombre}</option>`);
    }
}
actualizarTodo();