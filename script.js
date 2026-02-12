console.log("Sistema Motika cargado correctamente");

/* --- ESTADO GLOBAL --- */
let productos = JSON.parse(localStorage.getItem('productos')) || [];
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let encargos = JSON.parse(localStorage.getItem('encargos')) || [];
let historialReportes = JSON.parse(localStorage.getItem('historialReportes')) || [];

/* --- NAVEGACIÓN --- */
window.showSection = function(id) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
}

/* --- GESTIÓN DE PRODUCTOS --- */
const fProd = document.getElementById('form-producto');
if(fProd) {
    fProd.addEventListener('submit', (e) => {
        e.preventDefault();
        productos.push({
            id: Date.now(),
            nombre: document.getElementById('prod-nombre').value,
            cantidad: parseInt(document.getElementById('prod-cantidad').value),
            costo: parseFloat(document.getElementById('prod-costo').value),
            precio: parseFloat(document.getElementById('prod-precio').value)
        });
        actualizarTodo();
        fProd.reset();
    });
}

window.eliminarProd = function(id) {
    if(confirm("¿Eliminar este producto?")) {
        productos = productos.filter(p => p.id !== id);
        actualizarTodo();
    }
}

/* --- GESTIÓN DE PEDIDOS --- */
window.agregarFila = function() {
    const div = document.createElement('div');
    div.className = 'fila-producto';
    div.innerHTML = `
        <input type="text" placeholder="Producto" class="p-nombre" required> 
        <input type="number" placeholder="Cant." class="p-cant" required> 
        <button type="button" onclick="this.parentElement.remove()" style="color:red; background:none; border:none; cursor:pointer;">✕</button>
    `;
    const contenedor = document.getElementById('contenedor-filas-productos');
    if(contenedor) contenedor.appendChild(div);
}

const fEnc = document.getElementById('form-encargo');
if(fEnc) {
    fEnc.addEventListener('submit', (e) => {
        e.preventDefault();
        const cliente = document.getElementById('enc-cliente').value;
        const total = parseFloat(document.getElementById('enc-total').value);
        const abono = parseFloat(document.getElementById('enc-abono').value) || 0;
        
        encargos.push({
            id: Date.now(),
            cliente: cliente,
            total: total,
            abono: abono,
            deuda: total - abono,
            entregadoTotal: false,
            tipo: 'pedido',
            items: Array.from(document.querySelectorAll('.fila-producto')).map(f => ({
                nombre: f.querySelector('.p-nombre').value,
                cant: f.querySelector('.p-cant').value
            }))
        });
        
        if(abono > 0) {
            transacciones.push({
                id: Date.now() + 1,
                tipo: 'ingreso',
                desc: `Abono inicial: ${cliente}`,
                monto: abono,
                fecha: new Date().toLocaleDateString()
            });
        }
        actualizarTodo();
        fEnc.reset();
        document.getElementById('contenedor-filas-productos').innerHTML = '<div class="fila-producto"><input type="text" placeholder="Producto" class="p-nombre" required><input type="number" placeholder="Cant." class="p-cant" required></div>';
    });
}

/* --- DEUDORES (SOLUCIÓN AL REGISTRO) --- */
const fDeuda = document.getElementById('form-deuda-directa');
if(fDeuda) {
    fDeuda.addEventListener('submit', (e) => {
        e.preventDefault(); 
        const m = parseFloat(document.getElementById('deuda-monto').value);
        const c = document.getElementById('deuda-cliente').value;
        
        encargos.push({
            id: Date.now(),
            cliente: c,
            total: m,
            abono: 0,
            deuda: m,
            entregadoTotal: true,
            tipo: 'directa'
        });
        actualizarTodo();
        fDeuda.reset();
        alert("Deudor registrado correctamente");
    });
}

window.abonar = function(id) {
    const e = encargos.find(x => x.id === id);
    const input = document.getElementById(`in-abono-${id}`);
    if(!input) return;
    const monto = parseFloat(input.value);
    
    if(!monto || monto <= 0 || monto > e.deuda) return alert("Monto inválido");
    
    e.deuda -= monto;
    e.abono += monto;
    transacciones.push({
        id: Date.now(),
        tipo: 'ingreso', 
        desc: `Abono de: ${e.cliente}`, 
        monto: monto, 
        fecha: new Date().toLocaleDateString()
    });
    actualizarTodo();
}

/* --- VENTAS Y LOGÍSTICA (SOLUCIÓN AL REINICIO) --- */
const inputBusqueda = document.getElementById('input-buscar-prod');
const listaSugerencias = document.getElementById('lista-sugerencias');
const hiddenId = document.getElementById('select-producto-id');

if (inputBusqueda) {
    inputBusqueda.addEventListener('input', () => {
        const texto = inputBusqueda.value.toLowerCase();
        listaSugerencias.innerHTML = '';
        if (texto.length < 1) return;
        const coincidencias = productos.filter(p => p.nombre.toLowerCase().includes(texto) && p.cantidad > 0);
        coincidencias.forEach(p => {
            const div = document.createElement('div');
            div.innerHTML = `${p.nombre} (Stock: ${p.cantidad})`;
            div.style = "padding:8px; cursor:pointer; border-bottom:1px solid #eee; background:white;";
            div.onclick = () => {
                inputBusqueda.value = p.nombre;
                hiddenId.value = p.id;
                listaSugerencias.innerHTML = '';
            };
            listaSugerencias.appendChild(div);
        });
    });
}

const fTrans = document.getElementById('form-transaccion');
if(fTrans) {
    fTrans.addEventListener('submit', (e) => {
        e.preventDefault();
        const tipo = document.getElementById('trans-tipo').value;
        let monto = parseFloat(document.getElementById('trans-monto').value) || 0;
        let desc = document.getElementById('trans-desc').value;

        if(tipo === 'venta') {
            const pId = hiddenId.value;
            const cant = parseInt(document.getElementById('trans-cantidad').value);
            const p = productos.find(x => x.id == pId);
            if(p && p.cantidad >= cant) {
                p.cantidad -= cant;
                monto = p.precio * cant;
                desc = `Venta: ${p.nombre} x${cant}`;
            } else {
                return alert("Selecciona un producto válido con stock.");
            }
        }

        transacciones.push({
            id: Date.now(),
            tipo: (tipo === 'gasto' ? 'gasto' : 'ingreso'),
            desc: desc,
            monto: monto,
            fecha: new Date().toLocaleDateString()
        });
        actualizarTodo();
        fTrans.reset();
        window.toggleProductoSelector();
    });
}

const fGastosOp = document.getElementById('form-gastos-diarios');
if(fGastosOp) {
    fGastosOp.addEventListener('submit', (e) => {
        e.preventDefault(); 
        const m = parseFloat(document.getElementById('gasto-monto-op').value);
        const cat = document.getElementById('gasto-categoria').value;
        const det = document.getElementById('gasto-desc-op').value;

        transacciones.push({
            id: Date.now(),
            tipo: 'gasto',
            desc: `[${cat}] ${det}`,
            monto: m,
            fecha: document.getElementById('gasto-fecha').value || new Date().toLocaleDateString(),
            esLogistica: true
        });
        actualizarTodo();
        fGastosOp.reset();
        alert("Gasto de logística registrado");
    });
}

/* --- RENDERIZADO --- */
function actualizarTodo() {
    localStorage.setItem('productos', JSON.stringify(productos));
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    localStorage.setItem('encargos', JSON.stringify(encargos));
    renderInventario();
    renderPedidos();
    renderDeudas();
    renderFinanzas();
    renderDashboard();
}

function renderInventario() {
    const t = document.getElementById('tabla-inventario');
    if(!t) return;
    let cTotal = 0, vTotal = 0;
    t.innerHTML = productos.map(p => {
        cTotal += (p.costo * p.cantidad); vTotal += (p.precio * p.cantidad);
        return `<tr><td>${p.nombre}</td><td>${p.cantidad}</td><td>$${p.costo}</td><td>$${p.precio}</td><td><button onclick="eliminarProd(${p.id})">❌</button></td></tr>`;
    }).join('');
    document.getElementById('float-costo').innerText = `$${cTotal.toLocaleString()}`;
    document.getElementById('float-venta').innerText = `$${vTotal.toLocaleString()}`;
}

function renderFinanzas() {
    const lista = document.getElementById('lista-transacciones');
    const logistica = document.getElementById('tabla-gastos-logistica');
    if(lista) {
        lista.innerHTML = transacciones.map(t => `
            <tr><td>${t.fecha}</td><td>${t.desc}</td><td style="color:${t.tipo==='ingreso'?'green':'red'}">$${t.monto}</td></tr>
        `).reverse().join('');
    }
    if(logistica) {
        logistica.innerHTML = transacciones.filter(t => t.esLogistica).map(t => `
            <tr><td>${t.fecha}</td><td>${t.desc}</td><td>$${t.monto}</td></tr>
        `).reverse().join('');
    }
}

function renderDeudas() {
    const t = document.getElementById('tabla-deudores');
    if(!t) return;
    const deudores = encargos.filter(e => e.deuda > 0);
    t.innerHTML = deudores.map(e => `
        <tr>
            <td>${e.cliente}</td>
            <td style="color:red; font-weight:bold;">$${e.deuda}</td>
            <td><input type="number" id="in-abono-${e.id}" style="width:70px" placeholder="$"></td>
            <td><button onclick="abonar(${e.id})" style="background:green;color:white;border:none;padding:5px;cursor:pointer;">Abonar</button></td>
        </tr>
    `).join('');
}

function renderPedidos() {
    const c = document.getElementById('lista-pedidos-clientes');
    if(!c) return;
    c.innerHTML = encargos.filter(e => e.tipo === 'pedido' && !e.entregadoTotal).map(e => `
        <div class="card" style="border:1px solid #ccc; padding:10px; margin:5px; border-radius:8px;">
            <strong>👤 ${e.cliente}</strong><br>Debe: $${e.deuda}
            <button onclick="entregarPedido(${e.id})" style="display:block; width:100%; margin-top:5px;">Entregar</button>
        </div>
    `).join('');
}

function renderDashboard() {
    let ing = 0, gas = 0;
    transacciones.forEach(t => t.tipo === 'ingreso' ? ing += t.monto : gas += t.monto);
    const eGan = document.getElementById('total-ganancias');
    const eGas = document.getElementById('total-gastos');
    const eBal = document.getElementById('balance-final');
    if(eGan) eGan.innerText = `$${ing.toLocaleString()}`;
    if(eGas) eGas.innerText = `$${gas.toLocaleString()}`;
    if(eBal) eBal.innerText = `$${(ing - gas).toLocaleString()}`;
    function renderDashboard() {
    let ing = 0, gas = 0;
    transacciones.forEach(t => t.tipo === 'ingreso' ? ing += t.monto : gas += t.monto);
    
    // Elementos existentes
    const eGan = document.getElementById('total-ganancias');
    const eGas = document.getElementById('total-gastos');
    const eBal = document.getElementById('balance-final');
    
    // Nuevos elementos para Dashboard completo
    const eInv = document.getElementById('dash-valor-inv');
    const ePat = document.getElementById('dash-patrimonio');

    if(eGan) eGan.innerText = `$${ing.toLocaleString()}`;
    if(eGas) eGas.innerText = `$${gas.toLocaleString()}`;
    if(eBal) eBal.innerText = `$${(ing - gas).toLocaleString()}`;

    // Cálculos para el Dashboard
    let valorCostoInv = productos.reduce((acc, p) => acc + (p.costo * p.cantidad), 0);
    if(eInv) eInv.innerText = `$${valorCostoInv.toLocaleString()}`;
    if(ePat) ePat.innerText = `$${(valorCostoInv + (ing - gas)).toLocaleString()}`;
}
}

window.toggleProductoSelector = function() {
    const tipo = document.getElementById('trans-tipo').value;
    const isVenta = (tipo === 'venta');
    document.getElementById('contenedor-busqueda-prod').style.display = isVenta ? 'block' : 'none';
    document.getElementById('trans-cantidad').style.display = isVenta ? 'block' : 'none';
    document.getElementById('trans-monto').style.display = isVenta ? 'none' : 'block';
    document.getElementById('trans-desc').style.display = isVenta ? 'none' : 'block';
}
/* --- SISTEMA DE CIERRE Y BALANCE GENERAL --- */

window.cerrarCaja = function() {
    if (!confirm("¿Estás seguro de cerrar las ventas? Esto generará un balance general y limpiará las transacciones actuales.")) return;

    // 1. Cálculos de Totales
    let ingresos = 0;
    let gastos = 0;
    let ventasDetalladas = [];
    let gastosDetallados = [];

    transacciones.forEach(t => {
        if (t.tipo === 'ingreso') {
            ingresos += t.monto;
            ventasDetalladas.push(`${t.desc}: $${t.monto}`);
        } else {
            gastos += t.monto;
            gastosDetallados.push(`${t.desc}: $${t.monto}`);
        }
    });

    // 2. Cálculo de Inventario Actual
    let valorCostoInventario = productos.reduce((acc, p) => acc + (p.costo * p.cantidad), 0);
    let valorVentaInventario = productos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);

    // 3. Deudas Pendientes
    let totalDeudas = encargos.reduce((acc, e) => acc + e.deuda, 0);

    // 4. Crear el Objeto del Reporte
    const nuevoReporte = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        totalIngresos: ingresos,
        totalGastos: gastos,
        balanceNeto: ingresos - gastos,
        valorInventario: valorVentaInventario,
        deudasPendientes: totalDeudas,
        detalleVentas: ventasDetalladas,
        detalleGastos: gastosDetallados
    };

    // 5. Guardar en Historial y Limpiar Transacciones para el nuevo día
    historialReportes.push(nuevoReporte);
    localStorage.setItem('historialReportes', JSON.stringify(historialReportes));
    
    // Opcional: Si quieres vaciar las ventas del día al cerrar:
    transacciones = []; 
    
    actualizarTodo();
    renderHistorialReportes();
    alert("Caja cerrada. El balance se ha guardado en Reportes.");
}

function renderHistorialReportes() {
    // Cambié 'lista-reportes-historial' por 'historial-reportes' para que coincida con tu HTML
    const contenedor = document.getElementById('historial-reportes');
    if (!contenedor) return;

    if (historialReportes.length === 0) {
        contenedor.innerHTML = "<p style='padding:20px; color:gray;'>No hay cierres de caja registrados aún.</p>";
        return;
    }

    contenedor.innerHTML = historialReportes.map(r => `
        <div class="card" style="border-left: 5px solid #28a745; margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4 style="margin:0;">📅 Cierre: ${r.fecha}</h4>
                <button onclick="eliminarReporte(${r.id})" style="background:none; border:none; color:red; cursor:pointer;">🗑️ Borrar</button>
            </div>
            <hr style="margin:10px 0; border:0; border-top:1px solid #eee;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <p><b>Ingresos:</b> <span style="color:green">$${r.totalIngresos.toLocaleString()}</span></p>
                <p><b>Gastos:</b> <span style="color:red">$${r.totalGastos.toLocaleString()}</span></p>
                <p><b>Balance Neto:</b> <b>$${r.balanceNeto.toLocaleString()}</b></p>
                <p><b>Stock en tienda:</b> $${r.valorInventario.toLocaleString()}</p>
                <p><b>Deudas Clientes:</b> <span style="color:orange">$${r.deudasPendientes.toLocaleString()}</span></p>
            </div>
            <details style="margin-top:10px; font-size:0.9em; color:#555;">
                <summary style="cursor:pointer; color:#007bff;">Ver detalle de movimientos</summary>
                <p style="margin-top:5px;"><b>Ventas:</b> ${r.detalleVentas.join(', ') || 'Sin ventas'}</p>
                <p><b>Gastos:</b> ${r.detalleGastos.join(', ') || 'Sin gastos'}</p>
            </details>
        </div>
    `).reverse().join('');
}

window.eliminarReporte = function(id) {
    if(confirm("¿Eliminar este registro histórico?")) {
        historialReportes = historialReportes.filter(r => r.id !== id);
        localStorage.setItem('historialReportes', JSON.stringify(historialReportes));
        renderHistorialReportes();
    }
}

// Modifiqué actualizarTodo para que incluya el render de reportes
const originalActualizarTodo = actualizarTodo;
actualizarTodo = function() {
    originalActualizarTodo();
    localStorage.setItem('historialReportes', JSON.stringify(historialReportes));
    renderHistorialReportes();
}
window.onload = () => {
    actualizarTodo();
    window.toggleProductoSelector();
};
/* --- LOGÍSTICA DE COMPRAS --- */
window.generarListaCompras = function() {
    const contenedor = document.getElementById('seccion-lista-compras');
    const listaUl = document.getElementById('lista-compras-items');
    
    // 1. Filtrar solo los encargos que son tipo 'pedido' y no han sido entregados
    const pedidosPendientes = encargos.filter(e => e.tipo === 'pedido' && !e.entregadoTotal);
    
    if (pedidosPendientes.length === 0) {
        alert("No hay pedidos pendientes para generar lista.");
        return;
    }

    // 2. Consolidar productos repetidos
    const consolidado = {};

    pedidosPendientes.forEach(pedido => {
        pedido.items.forEach(item => {
            const nombre = item.nombre.trim().toLowerCase();
            const cantidad = parseInt(item.cant);

            if (consolidado[nombre]) {
                consolidado[nombre] += cantidad;
            } else {
                consolidado[nombre] = cantidad;
            }
        });
    });

    // 3. Renderizar la lista con checkboxes para ir marcando
    listaUl.innerHTML = "";
    for (const [prod, cant] of Object.entries(consolidado)) {
        const li = document.createElement('li');
        li.style = "padding: 8px 0; border-bottom: 1px solid #ddd; display: flex; align-items: center; gap: 10px;";
        li.innerHTML = `
            <input type="checkbox" style="width:20px; height:20px; cursor:pointer;">
            <span style="font-size: 1.1em; text-transform: capitalize;"><b>${prod}</b> — Cantidad: ${cant}</span>
        `;
        listaUl.appendChild(li);
    }

    // 4. Mostrar el contenedor
    contenedor.style.display = 'block';
    window.scrollTo({ top: contenedor.offsetTop - 20, behavior: 'smooth' });
}