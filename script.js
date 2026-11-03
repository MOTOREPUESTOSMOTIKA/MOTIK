console.log("Sistema Motika Profesional cargado correctamente");

/* --- ESTADO GLOBAL --- */
let productos = JSON.parse(localStorage.getItem('productos')) || [];
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let encargos = JSON.parse(localStorage.getItem('encargos')) || [];
let historialReportes = JSON.parse(localStorage.getItem('historialReportes')) || [];
let gastosOperativos = JSON.parse(localStorage.getItem('gastosOperativos')) || [];
let cuentasPorPagar = JSON.parse(localStorage.getItem('cuentasPorPagar')) || [];

/* --- NAVEGACIÓN --- */
window.showSection = function(id) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
}

/* --- CONTROL DEL MENÚ CELULAR --- */
window.toggleMenu = function() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.toggle('active');
    }
}

/* --- GESTIÓN DE PRODUCTOS (CONTROL POR LOTES Y PRECIOS SEPARADOS) --- */
const fProd = document.getElementById('form-producto');
if(fProd) {
    fProd.addEventListener('submit', (e) => {
        e.preventDefault();
        const codigoInput = document.getElementById('prod-codigo').value.trim();
        const nombreInput = document.getElementById('prod-nombre').value.trim();
        const cantidadInput = parseInt(document.getElementById('prod-cantidad').value);
        const costoInput = parseFloat(document.getElementById('prod-costo').value);
        const precioInput = parseFloat(document.getElementById('prod-precio').value);

        // Buscar si ya existe EXACTAMENTE el mismo producto con el MISMO precio de venta
        let productoExistente = productos.find(p => 
            (codigoInput !== '' && p.codigo === codigoInput && p.precio === precioInput) || 
            (p.nombre.toLowerCase() === nombreInput.toLowerCase() && p.precio === precioInput)
        );

        if (productoExistente) {
            // Si el precio y producto son iguales, solo suma al stock existente
            productoExistente.cantidad += cantidadInput;
            productoExistente.costo = costoInput; // Actualiza último costo del lote
        } else {
            // Si llega con precio diferente, se crea como un nuevo registro (lote independiente)
            productos.push({
                id: Date.now(),
                nombre: nombreInput,
                codigo: codigoInput, 
                cantidad: cantidadInput,
                costo: costoInput,
                precio: precioInput
            });
        }

        // Limpiar lotes viejos en stock 0 si ya existe un lote nuevo del mismo producto
        limpiarLotesAgotados();

        actualizarTodo();
        fProd.reset();
    });
}

// Función para limpiar productos viejos en 0 cuando ya hay un reemplazo con precio nuevo
function limpiarLotesAgotados() {
    // Agrupamos por nombre/código para ver cuáles tienen duplicados con diferente precio
    productos = productos.filter(p => {
        if (p.cantidad > 0) return true; // Si tiene stock, se queda siempre
        
        // Si la cantidad es 0, verificamos si existe OTRO registro con el mismo nombre y stock > 0 o ID más reciente
        let tieneReemplazoActivo = productos.some(other => 
            other.id !== p.id && 
            other.nombre.toLowerCase() === p.nombre.toLowerCase() && 
            other.cantidad > 0
        );

        // Si tiene reemplazo activo, eliminamos este viejo en 0. Si no, lo dejamos visible para saber que falta.
        return !tieneReemplazoActivo;
    });
}

window.eliminarProd = function(id) {
    if(confirm("¿Estás seguro de eliminar este producto?")) {
        productos = productos.filter(p => p.id !== id);
        actualizarTodo();
    }
}

// Filtro rápido para mostrar productos con stock de 3 o menos
window.filtrarStockBajo = function() {
    const t = document.getElementById('tabla-inventario');
    if(!t) return;
    
    let filtrados = productos.filter(p => p.cantidad <= 3);
    if(filtrados.length === 0) {
        alert("No hay productos con stock de 3 o menos.");
        renderInventario();
        return;
    }

    t.innerHTML = filtrados.map(p => `
        <tr style="${p.cantidad === 0 ? 'background: #ffe6e6;' : 'background: #fff9db;'}">
            <td><b>${p.nombre}</b> <br><small>Código: ${p.codigo || 'N/A'}</small></td>
            <td><b>${p.cantidad}</b> (¡Stock Bajo!)</td>
            <td>$${p.costo.toLocaleString()}</td>
            <td>$${p.precio.toLocaleString()}</td>
            <td>
                <button class="btn-main" onclick="agregarAListaComprasDirecto('${p.nombre}')" style="font-size:11px; padding:5px;">🛒 Comprar</button>
                <button class="btn-danger" onclick="eliminarProd(${p.id})">❌</button>
            </td>
        </tr>
    `).join('');
}

window.agregarAListaComprasDirecto = function(nombreProd) {
    alert(`El producto "${nombreProd}" ha sido tomado en cuenta para reabastecimiento.`);
    showSection('pedidos');
}
/* --- GESTIÓN DE PEDIDOS Y ABONOS INTELIGENTES --- */
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
        
        // Preguntamos a qué billetera va el abono inicial del cliente
        let metodoAbono = 'efectivo';
        if (abono > 0) {
            let seleccion = prompt("¿A dónde ingresa el abono inicial? Escribe:\n1 para Efectivo (Caja)\n2 para Transferencia (Banco)", "1");
            if (seleccion === "2") {
                metodoAbono = 'transferencia';
            }
        }
        
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
                metodo: metodoAbono,
                desc: `Abono pedido de: ${cliente}`,
                monto: abono,
                fecha: new Date().toLocaleDateString()
            });
        }
        actualizarTodo();
        fEnc.reset();
        document.getElementById('contenedor-filas-productos').innerHTML = '<div class="fila-producto"><input type="text" placeholder="Producto" class="p-nombre" required><input type="number" placeholder="Cant." class="p-cant" required></div>';
        alert("Pedido guardado con éxito.");
    });
}

window.entregarPedido = function(id) {
    const e = encargos.find(x => x.id === id);
    if(e.deuda > 0) {
        alert(`No se puede entregar. El cliente aún debe $${e.deuda.toLocaleString()}`);
        return;
    }
    if(confirm("¿Confirmar entrega total del pedido?")) {
        e.entregadoTotal = true;
        actualizarTodo();
    }
}

/* --- DEUDORES (CLIENTES) --- */
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
        alert("Deudor registrado correctamente.");
    });
}

window.abonar = function(id) {
    const e = encargos.find(x => x.id === id);
    const input = document.getElementById(`in-abono-${id}`);
    if(!input) return;
    const monto = parseFloat(input.value);
    
    if(!monto || monto <= 0 || monto > e.deuda) return alert("Monto de abono inválido.");
    
    let metodoAbono = prompt("¿Dónde recibe este abono? Escribe:\n1 para Efectivo (Caja)\n2 para Transferencia (Banco)", "1");
    let metodo = (metodoAbono === "2") ? 'transferencia' : 'efectivo';

    e.deuda -= monto;
    e.abono += monto;
    
    transacciones.push({
        id: Date.now(),
        tipo: 'ingreso', 
        metodo: metodo,
        desc: `Abono de cliente: ${e.cliente}`, 
        monto: monto, 
        fecha: new Date().toLocaleDateString()
    });
    
    actualizarTodo();
    alert("Abono registrado correctamente.");
}

/* --- MÓDULO DE GASTOS Y SURTIDO PROFESIONAL (CON CUENTAS POR PAGAR) --- */
const fGastosOp = document.getElementById('form-gastos-diarios');
if(fGastosOp) {
    fGastosOp.addEventListener('submit', (e) => {
        e.preventDefault();
        const fecha = document.getElementById('gasto-fecha').value || new Date().toLocaleDateString();
        const categoria = document.getElementById('gasto-categoria').value;
        const detalle = document.getElementById('gasto-desc-op').value;
        const monto = parseFloat(document.getElementById('gasto-monto-op').value);

        gastosOperativos.push({
            id: Date.now(),
            fecha,
            categoria,
            detalle,
            monto
        });

        // Si la categoría es "Surtido", aplicamos la regla contable exacta de fondos
        if (categoria === 'Surtido') {
            procesarPagoSurtido(monto, detalle, fecha);
        } else {
            // Gasto operativo normal (ej. transporte, servicios): descuenta de efectivo
            transacciones.push({
                id: Date.now() + 1,
                tipo: 'gasto',
                metodo: 'efectivo',
                desc: `Gasto [${categoria}]: ${detalle}`,
                monto: monto,
                fecha: fecha
            });
        }

        actualizarTodo();
        fGastosOp.reset();
        alert("Gasto/Surtido registrado correctamente.");
    });
}

// Función contable para surtido: Efectivo -> Transferencia -> Deuda con Proveedor
function procesarPagoSurtido(montoTotalSurtido, detalle, fecha) {
    // Calcular efectivo y transferencias actuales disponibles
    let ingEf = 0, gasEf = 0, ingTr = 0, gasTr = 0;
    transacciones.forEach(t => {
        if (t.tipo === 'ingreso') {
            if (t.metodo === 'transferencia') ingTr += t.monto;
            else ingEf += t.monto;
        } else {
            if (t.metodo === 'transferencia') gasTr += t.monto;
            else gasEf += t.monto;
        }
    });

    let efectivoDisponible = ingEf - gasEf;
    let transferenciaDisponible = ingTr - gasTr;

    let montoRestante = montoTotalSurtido;

    // 1. Intentar pagar con Efectivo
    let pagadoConEfectivo = Math.min(montoRestante, Math.max(0, efectivoDisponible));
    if (pagadoConEfectivo > 0) {
        transacciones.push({
            id: Date.now(),
            tipo: 'gasto',
            metodo: 'efectivo',
            desc: `Surtido (Efectivo): ${detalle}`,
            monto: pagadoConEfectivo,
            fecha: fecha
        });
        montoRestante -= pagadoConEfectivo;
    }

    // 2. Si aún falta dinero, intentar pagar con Transferencias (Bancos)
    if (montoRestante > 0 && transferenciaDisponible > 0) {
        let pagadoConBanco = Math.min(montoRestante, transferenciaDisponible);
        transacciones.push({
            id: Date.now() + 1,
            tipo: 'gasto',
            metodo: 'transferencia',
            desc: `Surtido (Banco): ${detalle}`,
            monto: pagadoConBanco,
            fecha: fecha
        });
        montoRestante -= pagadoConBanco;
    }

    // 3. Si todavía queda dinero pendiente, se convierte en una Cuenta por Pagar (Deuda con proveedor)
    if (montoRestante > 0) {
        cuentasPorPagar.push({
            id: Date.now() + 2,
            proveedor: detalle,
            montoDeuda: montoRestante,
            fecha: fecha,
            estado: 'Pendiente'
        });
        alert(`Atención: El efectivo y las transferencias no alcanzaban a cubrir todo el surtido. Se ha registrado una Cuenta por Pagar al proveedor por: $${montoRestante.toLocaleString()}`);
    }
}
/* --- VENTAS Y BÚSQUEDA --- */
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
            div.innerHTML = `${p.nombre} (Stock: ${p.cantidad}) - $${p.precio.toLocaleString()}`;
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
        const metodoPago = document.getElementById('trans-metodo-pago').value; // 'efectivo' o 'transferencia'
        let monto = parseFloat(document.getElementById('trans-monto').value) || 0;
        let desc = document.getElementById('trans-desc').value;

        if(tipo === 'venta') {
            const pId = hiddenId.value;
            const cant = parseInt(document.getElementById('trans-cantidad').value);
            const p = productos.find(x => x.id == pId);
            if(p && p.cantidad >= cant) {
                p.cantidad -= cant;
                monto = p.precio * cant;
                desc = `Venta (${metodoPago}): ${p.nombre} x${cant}`;
            } else {
                return alert("Selecciona un producto válido con stock disponible.");
            }
        }

        transacciones.push({
            id: Date.now(),
            tipo: (tipo === 'gasto' ? 'gasto' : 'ingreso'),
            metodo: metodoPago,
            desc: desc,
            monto: monto,
            fecha: new Date().toLocaleDateString()
        });
        
        actualizarTodo();
        fTrans.reset();
        window.toggleProductoSelector();
        alert("Movimiento registrado con éxito.");
    });
}

/* --- RENDERIZADO Y CONTROL FINANCIERO GENERAL --- */
function actualizarTodo() {
    localStorage.setItem('productos', JSON.stringify(productos));
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    localStorage.setItem('encargos', JSON.stringify(encargos));
    localStorage.setItem('gastosOperativos', JSON.stringify(gastosOperativos));
    localStorage.setItem('cuentasPorPagar', JSON.stringify(cuentasPorPagar));
    localStorage.setItem('historialReportes', JSON.stringify(historialReportes));

    renderInventario();
    renderPedidos();
    renderDeudas();
    renderFinanzas();
    renderGastosLogistica();
    renderDashboard();
    renderHistorialReportes();
}

function renderDashboard() {
    let ingEfectivo = 0, ingTransferencia = 0;
    let gasEfectivo = 0, gasTransferencia = 0;

    transacciones.forEach(t => {
        if (t.tipo === 'ingreso') {
            if (t.metodo === 'transferencia') ingTransferencia += t.monto;
            else ingEfectivo += t.monto;
        } else {
            if (t.metodo === 'transferencia') gasTransferencia += t.monto;
            else gasEfectivo += t.monto;
        }
    });

    let efectivoEnCaja = ingEfectivo - gasEfectivo;
    let saldoBancos = ingTransferencia - gasTransferencia;
    let totalIngresos = ingEfectivo + ingTransferencia;
    let totalGastos = gasEfectivo + gasTransferencia;

    // Total de mercancía comprada (Surtido histórico registrado)
    let totalComprado = gastosOperativos
        .filter(g => g.categoria === 'Surtido')
        .reduce((acc, g) => acc + g.monto, 0);

    const eGan = document.getElementById('total-ganancias');
    const eGas = document.getElementById('total-gastos');
    const eBal = document.getElementById('balance-final');
    const eInv = document.getElementById('dash-valor-inv');
    const ePat = document.getElementById('dash-patrimonio');

    let valorCostoInv = productos.reduce((acc, p) => acc + (p.costo * p.cantidad), 0);
    let dineroTotalLiquido = efectivoEnCaja + saldoBancos;

    if(eGan) eGan.innerText = `$${totalIngresos.toLocaleString()}`;
    if(eGas) eGas.innerText = `$${totalGastos.toLocaleString()}`;
    
    // Desglose profesional de efectivo vs bancos en caja final
    if(eBal) {
        eBal.innerHTML = `Físico: $${efectivoEnCaja.toLocaleString()} <br><span style="font-size:12px; font-weight:normal;">Bancos: $${saldoBancos.toLocaleString()}</span>`;
    }
    
    if(eInv) eInv.innerText = `$${valorCostoInv.toLocaleString()}`;
    if(ePat) ePat.innerText = `$${(valorCostoInv + dineroTotalLiquido).toLocaleString()}`;
}

function renderInventario() {
    const t = document.getElementById('tabla-inventario');
    if(!t) return;
    let cTotal = 0, vTotal = 0;
    
    t.innerHTML = productos.map(p => {
        cTotal += (p.costo * p.cantidad); 
        vTotal += (p.precio * p.cantidad);
        return `<tr>
            <td><b>${p.nombre}</b> <br><small style="color:gray;">Código: ${p.codigo || 'N/A'}</small></td>
            <td style="${p.cantidad <= 3 ? 'color: red; font-weight: bold;' : ''}">${p.cantidad}</td>
            <td>$${p.costo.toLocaleString()}</td>
            <td>$${p.precio.toLocaleString()}</td>
            <td>
                <button class="btn-main" onclick="agregarAListaComprasDirecto('${p.nombre}')" style="font-size:11px; padding:4px 8px; margin-right:4px;" title="Comprar">🛒</button>
                <button class="btn-danger" onclick="eliminarProd(${p.id})">❌</button>
            </td>
        </tr>`;
    }).join('');

    document.getElementById('float-costo').innerText = `$${cTotal.toLocaleString()}`;
    document.getElementById('float-venta').innerText = `$${vTotal.toLocaleString()}`;
}

function renderFinanzas() {
    const lista = document.getElementById('lista-transacciones');
    if(lista) {
        lista.innerHTML = transacciones.map(t => `
            <tr>
                <td>${t.fecha}</td>
                <td>${t.desc}</td>
                <td style="color:${t.tipo==='ingreso'?'green':'red'}; font-weight:bold;">
                    ${t.tipo==='ingreso'?'+':'-'}$${t.monto.toLocaleString()} 
                    <span style="font-size:11px; color:#555; background:#eee; padding:2px 5px; border-radius:4px;">${t.metodo || 'efectivo'}</span>
                </td>
            </tr>
        `).reverse().join('');
    }
}

function renderGastosLogistica() {
    const tabla = document.getElementById('tabla-gastos-logistica');
    if(tabla) {
        tabla.innerHTML = gastosOperativos.map(g => `
            <tr><td>${g.fecha}</td><td><b>${g.categoria}</b></td><td>${g.detalle}</td><td style="color:red">$${g.monto.toLocaleString()}</td></tr>
        `).reverse().join('');
    }
}

function renderDeudas() {
    const t = document.getElementById('tabla-deudores');
    if(!t) return;
    
    // Mostramos deudores (clientes) y debajo podemos listar cuentas por pagar (proveedores) si tienes tabla o sección para ello
    t.innerHTML = encargos.filter(e => e.deuda > 0).map(e => `
        <tr>
            <td>${e.cliente} (${e.tipo === 'pedido' ? 'Pedido' : 'Directa'})</td>
            <td style="color:red; font-weight:bold;">$${e.deuda.toLocaleString()}</td>
            <td><input type="number" id="in-abono-${e.id}" placeholder="Monto" style="width:90px"></td>
            <td><button class="btn-main" onclick="abonar(${e.id})" style="padding:5px 10px; font-size:12px;">Abonar</button></td>
        </tr>
    `).join('');
}

function renderPedidos() {
    const c = document.getElementById('lista-pedidos-clientes');
    if(!c) return;
    c.innerHTML = encargos.filter(e => e.tipo === 'pedido' && !e.entregadoTotal).map(e => `
        <div class="card">
            <strong>👤 ${e.cliente}</strong><br>
            Debe: <span style="color:red;">$${e.deuda.toLocaleString()}</span>
            <button onclick="entregarPedido(${e.id})" class="btn-main" style="width:100%; margin-top:10px; background:var(--success);">Entregar Pedido</button>
        </div>
    `).join('');
}

window.toggleProductoSelector = function() {
    const tipo = document.getElementById('trans-tipo').value;
    const isVenta = (tipo === 'venta');
    document.getElementById('contenedor-busqueda-prod').style.display = isVenta ? 'block' : 'none';
    document.getElementById('trans-cantidad').style.display = isVenta ? 'block' : 'none';
    document.getElementById('trans-monto').style.display = isVenta ? 'none' : 'block';
    document.getElementById('trans-desc').style.display = isVenta ? 'none' : 'block';
}

/* --- REPORTES DE CIERRE DE CAJA --- */
window.cerrarCaja = function() {
    if (!confirm("¿Cerrar caja? Esto guardará el reporte histórico.")) return;
    
    let ing = 0, gas = 0;
    transacciones.forEach(t => t.tipo === 'ingreso' ? ing += t.monto : gas += t.monto);

    historialReportes.push({
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        balanceNeto: ing - gas,
        totalIngresos: ing,
        totalGastos: gas,
        valorInventario: productos.reduce((acc, p) => acc + (p.costo * p.cantidad), 0),
        deudasPendientes: encargos.reduce((acc, e) => acc + e.deuda, 0)
    });
    
    transacciones = []; 
    actualizarTodo();
    alert("Cierre de caja guardado con éxito.");
}

function renderHistorialReportes() {
    const contenedor = document.getElementById('historial-reportes');
    if (!contenedor) return;
    contenedor.innerHTML = historialReportes.map(r => `
        <div class="card" style="border-left:5px solid var(--success); margin-bottom:15px;">
            <h4>📅 Cierre: ${r.fecha}</h4>
            <p><b>Balance Neto del Cierre: $${r.balanceNeto.toLocaleString()}</b></p>
            <p>Ingresos: $${r.totalIngresos.toLocaleString()} | Gastos: $${r.totalGastos.toLocaleString()}</p>
            <button class="btn-danger" onclick="eliminarReporte(${r.id})" style="margin-top:10px;">Eliminar Reporte</button>
        </div>
    `).reverse().join('');
}

window.eliminarReporte = function(id) {
    if(confirm("¿Eliminar este reporte?")) {
        historialReportes = historialReportes.filter(r => r.id !== id);
        actualizarTodo();
    }
}

window.generarListaCompras = function() {
    const contenedor = document.getElementById('seccion-lista-compras');
    const listaUl = document.getElementById('lista-compras-items');
    const pedidosPendientes = encargos.filter(e => e.tipo === 'pedido' && !e.entregadoTotal);
    
    const consolidado = {};
    pedidosPendientes.forEach(pedido => {
        pedido.items.forEach(item => {
            const nombre = item.nombre.trim().toLowerCase();
            consolidado[nombre] = (consolidado[nombre] || 0) + parseInt(item.cant);
        });
    });

    // Añadir también los productos con stock bajo (<= 3) automáticamente a la lista de compras
    productos.filter(p => p.cantidad <= 3).forEach(p => {
        const nombre = p.nombre.trim().toLowerCase();
        consolidado[nombre] = (consolidado[nombre] || 0) + 1; // Sugerir reabastecer al menos 1 unidad o más
    });

    listaUl.innerHTML = Object.entries(consolidado).map(([prod, cant]) => `
        <li style="padding:5px 0;"><input type="checkbox" style="margin-right:8px;"> <b>${prod}</b> - Sugerido: x${cant}</li>
    `).join('');
    contenedor.style.display = 'block';
}

/* --- ESCÁNER DE CÓDIGOS --- */
let html5QrCode;

window.startScanner = function() {
    const container = document.getElementById('reader-container');
    if (container) container.style.display = 'block';
    
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            handleScanSuccess(decodedText);
        }
    ).catch(err => {
        console.error(err);
        alert("Error al abrir cámara: Asegúrate de dar permisos.");
    });
}

function handleScanSuccess(codigoEscaneado) {
    stopScanner();
    const p = productos.find(x => x.codigo === codigoEscaneado || x.id.toString() === codigoEscaneado);

    if (p) {
        if (p.cantidad <= 0) return alert("Producto sin stock.");
        
        document.getElementById('input-buscar-prod').value = p.nombre;
        document.getElementById('select-producto-id').value = p.id;
        document.getElementById('trans-cantidad').focus();
    } else {
        alert("El código [" + codigoEscaneado + "] no está registrado en el inventario.");
    }
}

window.stopScanner = function() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            const container = document.getElementById('reader-container');
            if (container) container.style.display = 'none';
        }).catch(err => console.error("Error al detener escáner", err));
    }
}

window.onload = () => {
    actualizarTodo();
    window.toggleProductoSelector();
};
