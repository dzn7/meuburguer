"""
Edienai Lanches - Cliente de Impressão em Tempo Real (SSE)
Versão simplificada e otimizada com Server-Sent Events nativo
"""

import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox, scrolledtext
import threading
import time
from datetime import datetime, timezone
import os
import sys
import json
import queue
import requests
import win32print
import win32ui
import win32con
from PIL import Image, ImageFont, ImageDraw, ImageWin

# ============================================================================
# CONFIGURAÇÕES DO BACKEND
# ============================================================================

WORKERS_BASE_URL = 'https://edienai-lanches-worker.mackenziederick13.workers.dev'
AUTH_ROLE = 'owner'
AUTH_PIN = '3007'

# ============================================================================
# CONFIGURAÇÕES DA IMPRESSORA
# ============================================================================

DEFAULT_CONFIG = {
    'printer_name': 'ELGIN i9(USB)',
    'paper_width': '80mm',
    'text_size': 'extra',
    'rotation_degrees': 90,
    'line_spacing_px': 8,
    'force_bitmap': True,
    'auto_print_client': True,
    'auto_print_kitchen': True,
}

# Mapeamento de larguras de papel
PAPER_WIDTHS = {
    '58mm': 384,
    '72mm': 512,
    '80mm': 576
}

# Mapeamento de tamanhos de fonte
FONT_SIZES = {
    'pequeno': {'normal': 14, 'bold': 18, 'title': 22, 'header': 12, 'total': 20},
    'normal': {'normal': 18, 'bold': 22, 'title': 28, 'header': 16, 'total': 26},
    'grande': {'normal': 22, 'bold': 26, 'title': 32, 'header': 20, 'total': 30},
    'extra': {'normal': 26, 'bold': 30, 'title': 36, 'header': 24, 'total': 34}
}

# ============================================================================
# GERENCIAMENTO DE CONFIGURAÇÕES
# ============================================================================

APPDATA_DIR = os.path.join(os.getenv('APPDATA') or os.path.expanduser('~'), 'EdienaiPrinterRT')
os.makedirs(APPDATA_DIR, exist_ok=True)
CONFIG_FILE = os.path.join(APPDATA_DIR, 'config.json')

def load_config():
    """Carrega configurações do arquivo"""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return {**DEFAULT_CONFIG, **json.load(f)}
    except Exception as e:
        print(f"Erro ao carregar config: {e}")
    return DEFAULT_CONFIG.copy()

def save_config(config):
    """Salva configurações no arquivo"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Erro ao salvar config: {e}")
        return False

# ============================================================================
# CLIENTE SSE EM TEMPO REAL
# ============================================================================

class PrinterSSEClient:
    """Cliente SSE para receber comandos de impressão em tempo real"""
    
    def __init__(self, on_command_callback, on_status_callback):
        self.active = False
        self.on_command = on_command_callback
        self.on_status = on_status_callback
        self.session = requests.Session()
        self.processed_commands = set()
        self.thread = None
        self.last_heartbeat = time.time()
        self.polling_thread = None
        
    def start(self):
        """Inicia o cliente SSE"""
        if self.active:
            return
        self.active = True
        self.thread = threading.Thread(target=self._listen, daemon=True)
        self.thread.start()
        # Inicia polling de backup
        self.polling_thread = threading.Thread(target=self._polling_backup, daemon=True)
        self.polling_thread.start()
        self.on_status("🟢 Conectando ao servidor...")
        
    def stop(self):
        """Para o cliente SSE"""
        self.active = False
        self.on_status("🔴 Desconectado")
        
    def _listen(self):
        """Loop principal de escuta SSE"""
        url = f"{WORKERS_BASE_URL}/api/print/stream?role={AUTH_ROLE}&pin={AUTH_PIN}"
        headers = {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
        
        print(f"[SSE] Conectando a: {url}")
        
        backoff = 1
        max_backoff = 30
        
        while self.active:
            try:
                print(f"[SSE] Tentando conectar... (backoff: {backoff}s)")
                with self.session.get(url, headers=headers, stream=True, timeout=60) as resp:
                    print(f"[SSE] Resposta HTTP: {resp.status_code}")
                    if resp.status_code != 200:
                        self.on_status(f"⚠️ Erro HTTP {resp.status_code} - reconectando em {backoff}s")
                        time.sleep(backoff)
                        backoff = min(max_backoff, backoff * 2)
                        continue
                    
                    self.on_status("🟢 Conectado - aguardando comandos")
                    print("[SSE] Conexão estabelecida com sucesso!")
                    self.last_heartbeat = time.time()  # Reset heartbeat timer
                    backoff = 1
                    
                    buffer = ""
                    for line in resp.iter_lines(decode_unicode=True):
                        if not self.active:
                            break
                            
                        if not line:
                            # Fim do evento
                            if buffer:
                                try:
                                    print(f"[SSE] Evento recebido: {buffer[:100]}...")
                                    payload = json.loads(buffer)
                                    self._handle_event(payload)
                                except Exception as e:
                                    print(f"[SSE] Erro ao processar evento: {e}")
                                finally:
                                    buffer = ""
                            continue
                            
                        if line.startswith(":"):
                            # Heartbeat/comentário
                            self.last_heartbeat = time.time()
                            print("[SSE] Heartbeat recebido")
                            continue
                            
                        if line.startswith("data:"):
                            buffer = line[5:].strip()
                            print(f"[SSE] Dados recebidos: {buffer[:80]}...")
                            
            except requests.exceptions.Timeout:
                self.on_status("⏰ Timeout - reconectando...")
                time.sleep(2)
            except Exception as e:
                self.on_status(f"❌ Erro: {str(e)[:50]} - reconectando em {backoff}s")
                time.sleep(backoff)
                backoff = min(max_backoff, backoff * 2)
                
    def _handle_event(self, payload):
        """Processa eventos SSE recebidos"""
        event = payload.get('event')
        print(f"[SSE] Processando evento: {event}")
        
        if event == 'print:snapshot':
            # Snapshot inicial com todos os comandos pendentes
            commands = payload.get('commands', [])
            print(f"[SSE] Snapshot recebido com {len(commands)} comandos")
            for cmd in commands:
                self._enqueue_command(cmd)
                
        elif event == 'print:enqueue':
            # Novo comando adicionado
            cmd = payload.get('command')
            print(f"[SSE] Novo comando recebido: {cmd.get('commandId') if cmd else 'None'}")
            if cmd:
                self._enqueue_command(cmd)
                
        elif event == 'print:noop':
            # Keep-alive
            print("[SSE] Keep-alive recebido")
            pass
        else:
            print(f"[SSE] Evento desconhecido: {event}")
            
    def _enqueue_command(self, command):
        """Enfileira comando se ainda não foi processado"""
        cmd_id = command.get('commandId')
        print(f"[SSE] Tentando enfileirar comando: {cmd_id}")
        
        if cmd_id and cmd_id not in self.processed_commands:
            self.processed_commands.add(cmd_id)
            self.on_command(command)
            print(f"[SSE] ✅ Comando {cmd_id} enfileirado com sucesso")
            
            # Limita tamanho do set para evitar memory leak
            if len(self.processed_commands) > 1000:
                old_commands = list(self.processed_commands)[:200]
                for old_cmd in old_commands:
                    self.processed_commands.discard(old_cmd)
        else:
            print(f"[SSE] ⚠️ Comando {cmd_id} já foi processado ou ID inválido")
    
    def _polling_backup(self):
        """Polling de backup a cada 10 segundos para garantir que não perca comandos"""
        url = f"{WORKERS_BASE_URL}/api/print/queue?role={AUTH_ROLE}&pin={AUTH_PIN}"
        
        while self.active:
            try:
                # Verifica se SSE está vivo (heartbeat nos últimos 90 segundos)
                time_since_heartbeat = time.time() - self.last_heartbeat
                
                if time_since_heartbeat > 90:
                    print(f"[POLLING] ⚠️ SSE sem heartbeat há {int(time_since_heartbeat)}s - usando polling")
                    self.on_status(f"⚠️ SSE inativo ({int(time_since_heartbeat)}s) - modo backup")
                
                # Busca comandos pendentes via polling
                print("[POLLING] Verificando comandos pendentes...")
                resp = self.session.get(url, timeout=10)
                
                if resp.status_code == 200:
                    data = resp.json()
                    commands = data.get('commands', [])
                    
                    if commands:
                        print(f"[POLLING] 📥 {len(commands)} comandos pendentes encontrados")
                        for cmd in commands:
                            self._enqueue_command(cmd)
                    else:
                        print("[POLLING] ✅ Nenhum comando pendente")
                        
            except Exception as e:
                print(f"[POLLING] Erro: {e}")
            
            # Aguarda 10 segundos antes do próximo polling
            time.sleep(10)

# ============================================================================
# CLIENTE SSE PARA PEDIDOS (REALTIME ORDERS)
# ============================================================================

class OrdersSSEClient:
    """Cliente SSE para receber pedidos em tempo real e imprimir automaticamente"""
    
    def __init__(self, on_new_order_callback, on_status_callback):
        self.active = False
        self.on_new_order = on_new_order_callback
        self.on_status = on_status_callback
        self.session = requests.Session()
        self.processed_orders = set()
        self.thread = None
        self.last_heartbeat = time.time()
        
    def start(self):
        """Inicia o cliente SSE de pedidos"""
        if self.active:
            return
        self.active = True
        self.thread = threading.Thread(target=self._listen, daemon=True)
        self.thread.start()
        print("[ORDERS SSE] Serviço de escuta de pedidos iniciado")
        
    def stop(self):
        """Para o cliente SSE de pedidos"""
        self.active = False
        print("[ORDERS SSE] Serviço de escuta de pedidos parado")
        
    def _listen(self):
        """Loop principal de escuta SSE para pedidos"""
        url = f"{WORKERS_BASE_URL}/realtime/orders/stream?role={AUTH_ROLE}&pin={AUTH_PIN}"
        headers = {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
        
        print(f"[ORDERS SSE] Conectando a: {url}")
        
        backoff = 1
        max_backoff = 30
        
        while self.active:
            try:
                print(f"[ORDERS SSE] Tentando conectar... (backoff: {backoff}s)")
                with self.session.get(url, headers=headers, stream=True, timeout=60) as resp:
                    print(f"[ORDERS SSE] Resposta HTTP: {resp.status_code}")
                    if resp.status_code != 200:
                        time.sleep(backoff)
                        backoff = min(max_backoff, backoff * 2)
                        continue
                    
                    print("[ORDERS SSE] Conexão estabelecida - escutando novos pedidos")
                    self.last_heartbeat = time.time()
                    backoff = 1
                    
                    buffer = ""
                    for line in resp.iter_lines(decode_unicode=True):
                        if not self.active:
                            break
                            
                        if not line:
                            # Fim do evento
                            if buffer:
                                try:
                                    print(f"[ORDERS SSE] Evento recebido: {buffer[:100]}...")
                                    payload = json.loads(buffer)
                                    self._handle_event(payload)
                                except Exception as e:
                                    print(f"[ORDERS SSE] Erro ao processar evento: {e}")
                                finally:
                                    buffer = ""
                            continue
                            
                        if line.startswith(":"):
                            # Heartbeat
                            self.last_heartbeat = time.time()
                            continue
                            
                        if line.startswith("data:"):
                            buffer = line[5:].strip()
                            
            except requests.exceptions.Timeout:
                print("[ORDERS SSE] Timeout - reconectando...")
                time.sleep(2)
            except Exception as e:
                print(f"[ORDERS SSE] Erro: {e} - reconectando em {backoff}s")
                time.sleep(backoff)
                backoff = min(max_backoff, backoff * 2)
                
    def _handle_event(self, payload):
        """Processa eventos SSE de pedidos recebidos"""
        event = payload.get('event')
        print(f"[ORDERS SSE] Processando evento: {event}")
        
        if event == 'orders:snapshot':
            # Snapshot inicial - ignora (não queremos imprimir pedidos antigos)
            orders = payload.get('orders', [])
            print(f"[ORDERS SSE] Snapshot inicial com {len(orders)} pedidos (ignorado)")
            
        elif event == 'orders:insert':
            # NOVO PEDIDO - ESTE É O QUE IMPORTA!
            order = payload.get('order')
            print(f"[ORDERS SSE] 🆕 NOVO PEDIDO RECEBIDO: {order.get('id') if order else 'None'}")
            if order:
                self._handle_new_order(order)
                
        elif event == 'orders:update':
            # Atualização de pedido - ignora
            print(f"[ORDERS SSE] Atualização de pedido (ignorado)")
            
        elif event == 'orders:noop':
            # Keep-alive
            print("[ORDERS SSE] Keep-alive recebido")
            pass
        else:
            print(f"[ORDERS SSE] Evento desconhecido: {event}")
            
    def _handle_new_order(self, order):
        """Processa novo pedido"""
        order_id = order.get('id') or order.get('orderId')
        
        print(f"[ORDERS SSE] Processando novo pedido: {order_id}")
        
        # Verifica se já foi processado
        if order_id and order_id not in self.processed_orders:
            self.processed_orders.add(order_id)
            self.on_new_order(order)
            print(f"[ORDERS SSE] ✅ Pedido {order_id} enfileirado para impressão")
            
            # Limita tamanho do set para evitar memory leak
            if len(self.processed_orders) > 500:
                old_orders = list(self.processed_orders)[:100]
                for old_order in old_orders:
                    self.processed_orders.discard(old_order)
        else:
            print(f"[ORDERS SSE] ⚠️ Pedido {order_id} já foi processado ou ID inválido")

# ============================================================================
# PROCESSADOR DE COMANDOS DE IMPRESSÃO
# ============================================================================

class PrintCommandProcessor:
    """Processa comandos de impressão"""
    
    def __init__(self, config, on_log_callback):
        self.config = config
        self.on_log = on_log_callback
        self.queue = queue.Queue()
        self.active = False
        self.thread = None
        self.session = requests.Session()
        
    def start(self):
        """Inicia o processador"""
        if self.active:
            return
        self.active = True
        self.thread = threading.Thread(target=self._process_loop, daemon=True)
        self.thread.start()
        
    def stop(self):
        """Para o processador"""
        self.active = False
        
    def enqueue(self, command):
        """Adiciona comando à fila"""
        cmd_id = command.get('commandId', 'unknown')
        print(f"[PROCESSOR] Comando {cmd_id} adicionado à fila (tamanho: {self.queue.qsize() + 1})")
        self.queue.put(command)
    
    def enqueue_order_auto_print(self, order):
        """Adiciona pedido à fila para impressão automática"""
        order_id = order.get('id') or order.get('orderId')
        print(f"[PROCESSOR] 📥 Novo pedido para impressão automática: {order_id}")
        
        # Verifica se as impressões automáticas estão habilitadas
        auto_client = self.config.get('auto_print_client', True)
        auto_kitchen = self.config.get('auto_print_kitchen', True)
        
        if not auto_client and not auto_kitchen:
            print(f"[PROCESSOR] ⚠️ Impressão automática desabilitada - Pedido {order_id} ignorado")
            self.on_log(f"⚠️ Impressão automática desabilitada - Pedido {order_id} ignorado", "warning")
            return
        
        # Cria comandos de impressão para cliente e/ou cozinha
        if auto_client:
            cmd_client = {
                'commandId': f"{order_id}_client_auto",
                'type': 'print',
                'printType': 'client',
                'orderData': order,
                'timestamp': time.time()
            }
            self.queue.put(cmd_client)
            print(f"[PROCESSOR] ✅ Impressão de CLIENTE enfileirada: {order_id}")
        
        if auto_kitchen:
            cmd_kitchen = {
                'commandId': f"{order_id}_kitchen_auto",
                'type': 'print',
                'printType': 'kitchen',
                'orderData': order,
                'timestamp': time.time()
            }
            self.queue.put(cmd_kitchen)
            print(f"[PROCESSOR] ✅ Impressão de COZINHA enfileirada: {order_id}")
        
        self.on_log(f"📥 Pedido {order_id} recebido - imprimindo automaticamente", "info")
        
    def _process_loop(self):
        """Loop de processamento de comandos"""
        print("[PROCESSOR] Thread de processamento iniciada")
        while self.active:
            try:
                if not self.queue.empty():
                    command = self.queue.get()
                    print(f"[PROCESSOR] Comando retirado da fila: {command.get('commandId')}")
                    self._handle_command(command)
                    self.queue.task_done()
                else:
                    time.sleep(0.1)
            except Exception as e:
                self.on_log(f"❌ Erro no processamento: {e}", "error")
                print(f"[PROCESSOR] Erro: {e}")
                time.sleep(1)
                
    def _handle_command(self, command):
        """Processa um comando específico"""
        cmd_id = command.get('commandId', 'unknown')
        cmd_type = command.get('type', 'unknown')
        
        print(f"[PROCESSOR] Processando comando {cmd_id} tipo: {cmd_type}")
        print(f"[PROCESSOR] Comando completo: {json.dumps(command, indent=2)}")
        self.on_log(f"🖨️ Processando comando {cmd_id} (tipo: {cmd_type})", "info")
        
        try:
            if cmd_type == 'print':
                order_data = command.get('orderData')
                print_type = command.get('printType', 'client')
                
                print(f"[PROCESSOR] Print Type: {print_type}")
                print(f"[PROCESSOR] Order Data: {order_data is not None}")
                
                if not order_data:
                    self._confirm_error(cmd_id, "Dados do pedido ausentes")
                    return
                
                # Verifica se a impressão automática está habilitada para este tipo
                if print_type == 'client' and not self.config.get('auto_print_client', True):
                    self.on_log(f"⚠️ Impressão automática de cliente desabilitada - Pedido {order_data.get('id', 'N/A')} ignorado", "warning")
                    self._confirm_success(cmd_id)  # Confirma como sucesso mas não imprime
                    return
                    
                if print_type == 'kitchen' and not self.config.get('auto_print_kitchen', True):
                    self.on_log(f"⚠️ Impressão automática de cozinha desabilitada - Pedido {order_data.get('id', 'N/A')} ignorado", "warning")
                    self._confirm_success(cmd_id)  # Confirma como sucesso mas não imprime
                    return
                    
                # Aplica configuração se fornecida
                printer_config = command.get('printerConfig')
                if printer_config:
                    print(f"[PROCESSOR] Atualizando config da impressora: {printer_config}")
                    self.config.update(printer_config)
                    
                # Executa impressão
                print(f"[PROCESSOR] Iniciando impressão - Tipo: {print_type}")
                success = self._print_order(order_data, print_type)
                
                if success:
                    self.on_log(f"✅ Pedido {order_data.get('id', 'N/A')} ({print_type}) impresso com sucesso", "success")
                    self._confirm_success(cmd_id)
                else:
                    self.on_log(f"❌ Falha ao imprimir pedido {order_data.get('id', 'N/A')} ({print_type})", "error")
                    self._confirm_error(cmd_id, "Falha na impressão")
                    
            elif cmd_type == 'config':
                config_data = command.get('config', {})
                if config_data:
                    self.config.update(config_data)
                    save_config(self.config)
                    self.on_log(f"⚙️ Configuração atualizada", "success")
                    self._confirm_success(cmd_id)
                else:
                    self._confirm_error(cmd_id, "Configuração ausente")
            else:
                print(f"[PROCESSOR] ⚠️ Tipo de comando desconhecido: {cmd_type}")
                self._confirm_error(cmd_id, f"Tipo de comando desconhecido: {cmd_type}")
                    
        except Exception as e:
            print(f"[PROCESSOR] ❌ Exceção: {e}")
            import traceback
            traceback.print_exc()
            self.on_log(f"❌ Erro ao processar comando: {e}", "error")
            self._confirm_error(cmd_id, str(e))
            
    def _print_order(self, order_data, print_type):
        """Imprime um pedido"""
        try:
            printer_name = self.config['printer_name']
            order_id = order_data.get('orderId', order_data.get('id', 'N/A'))
            
            print(f"[PRINT] Imprimindo pedido {order_id} - tipo: {print_type}")
            
            # Gera imagem do recibo
            img = self._generate_receipt_image(order_data, print_type)
            
            # Aplica rotação se configurada
            rotation = self.config.get('rotation_degrees', 0)
            if rotation and rotation != 0:
                print(f"[PRINT] Aplicando rotação de {rotation} graus (sentido horário)")
                # PIL rotate é anti-horário, então invertemos o valor
                # Para 90° horário (retrato correto), usamos -90 no PIL
                img = img.rotate(-rotation, expand=True)
            
            # Imprime via Windows
            hPrinter = win32print.OpenPrinter(printer_name)
            try:
                hDC = win32ui.CreateDC()
                hDC.CreatePrinterDC(printer_name)
                
                hDC.StartDoc(f"Pedido #{order_id} - {print_type}")
                hDC.StartPage()
                
                # Converte PIL Image para bitmap do Windows
                dib = ImageWin.Dib(img)
                dib.draw(hDC.GetHandleOutput(), (0, 0, img.width, img.height))
                
                hDC.EndPage()
                hDC.EndDoc()
                hDC.DeleteDC()
                
                print(f"[PRINT] ✅ Impressão concluída: {order_id} - {print_type}")
                return True
            finally:
                win32print.ClosePrinter(hPrinter)
                
        except Exception as e:
            print(f"[PRINT] ❌ Erro na impressão: {e}")
            self.on_log(f"❌ Erro na impressão: {e}", "error")
            return False
            
    def _generate_receipt_image(self, order_data, print_type):
        """Gera imagem do recibo"""
        # Configurações
        paper_width = PAPER_WIDTHS[self.config['paper_width']]
        font_sizes = FONT_SIZES[self.config['text_size']]
        margin = 16
        line_spacing = self.config['line_spacing_px']
        
        # Carrega fontes com suporte a caracteres acentuados
        # Tenta usar fontes com melhor suporte a Unicode
        font_paths = [
            "C:\\Windows\\Fonts\\seguisb.ttf",  # Segoe UI Bold (melhor para acentos)
            "C:\\Windows\\Fonts\\segoeui.ttf",  # Segoe UI
            "C:\\Windows\\Fonts\\arialuni.ttf", # Arial Unicode MS
            "C:\\Windows\\Fonts\\arial.ttf"     # Arial (fallback)
        ]
        
        font_path = None
        for path in font_paths:
            if os.path.exists(path):
                font_path = path
                break
        
        if not font_path:
            font_path = "C:\\Windows\\Fonts\\arial.ttf"  # Fallback final
        
        fonts = {
            'normal': ImageFont.truetype(font_path, font_sizes['normal'], encoding='unic'),
            'bold': ImageFont.truetype(font_path, font_sizes['bold'], encoding='unic'),
            'title': ImageFont.truetype(font_path, font_sizes['title'], encoding='unic'),
            'header': ImageFont.truetype(font_path, font_sizes['header'], encoding='unic'),
            'total': ImageFont.truetype(font_path, font_sizes['total'], encoding='unic'),
        }
        
        # Cria imagem temporária para calcular altura
        temp_img = Image.new('RGB', (paper_width, 1), 'white')
        temp_draw = ImageDraw.Draw(temp_img)
        
        # Monta conteúdo
        lines = []
        
        # Cabeçalho
        lines.append(('center', 'Edienai Lanches', fonts['title']))
        lines.append(('center', '-' * 32, fonts['normal']))
        
        if print_type == 'kitchen':
            lines.append(('center', '--- PEDIDO PARA COZINHA ---', fonts['bold']))
        else:
            lines.append(('center', '--- COMPROVANTE DE PEDIDO ---', fonts['bold']))
            
        lines.append(('center', '-' * 32, fonts['normal']))
        
        # Informações do pedido
        order_id = order_data.get('orderId', order_data.get('id', 'N/A'))
        lines.append(('left', f"Pedido #: {order_id}", fonts['normal']))
        # Garante que o nome do cliente seja string UTF-8
        customer_name = str(order_data.get('customerName', 'N/A'))
        lines.append(('left', f"Cliente: {customer_name}", fonts['normal']))
        
        delivery_option = order_data.get('deliveryOption', {})
        delivery_type = delivery_option.get('type', 'N/A')
        lines.append(('left', f"Tipo: {delivery_type}", fonts['normal']))
        
        if delivery_type == 'No Local':
            table = delivery_option.get('tableNumber', 'N/A')
            lines.append(('left', f"Mesa: {table}", fonts['normal']))
        elif delivery_type == 'Entrega':
            address = delivery_option.get('address', 'N/A')
            lines.append(('left', f"Endereço: {address}", fonts['normal']))
            
        # Data
        sent_at = order_data.get('sentAt')
        if sent_at:
            if isinstance(sent_at, str):
                dt = datetime.fromisoformat(sent_at.replace('Z', '+00:00'))
            else:
                dt = datetime.now()
            lines.append(('left', f"Data: {dt.strftime('%d/%m/%Y %H:%M')}", fonts['normal']))
            
        lines.append(('center', '-' * 32, fonts['normal']))
        lines.append(('left', 'ITENS:', fonts['header']))
        
        # Itens
        for item in order_data.get('items', []):
            # Garante que todos os textos sejam strings UTF-8
            name = str(item.get('name', 'Item'))
            qty = item.get('quantity', 1)
            price = item.get('totalItemPrice', 0)
            
            lines.append(('left', f"{qty}x {name}", fonts['bold']))
            
            # Complementos
            for comp in item.get('complements', []):
                comp_name = str(comp.get('name', 'Comp'))
                lines.append(('left', f"  - {comp_name}", fonts['normal']))
                
            # Observações
            notes = item.get('notes') or item.get('observations')
            if notes:
                notes = str(notes)
                lines.append(('left', f"  OBS: {notes}", fonts['normal']))
                
            if print_type != 'kitchen':
                lines.append(('right', f"Subtotal: R$ {price:.2f}".replace('.', ','), fonts['normal']))
                
        # Total
        lines.append(('center', '-' * 32, fonts['normal']))
        
        if print_type != 'kitchen':
            total = order_data.get('total', 0)
            lines.append(('right', f"TOTAL: R$ {total:.2f}".replace('.', ','), fonts['total']))
            lines.append(('left', f"Pagamento: {order_data.get('paymentMethod', 'N/A')}", fonts['normal']))
            
            troco_para = order_data.get('trocoPara')
            if troco_para:
                troco = float(troco_para) - float(total)
                lines.append(('left', f"Troco para: R$ {troco_para:.2f}".replace('.', ','), fonts['normal']))
                lines.append(('left', f"Troco: R$ {max(0, troco):.2f}".replace('.', ','), fonts['normal']))
                
        lines.append(('center', '-' * 32, fonts['normal']))
        
        if print_type == 'kitchen':
            lines.append(('center', 'Bom trabalho!', fonts['normal']))
        else:
            lines.append(('center', 'Obrigado pelo seu pedido!', fonts['normal']))
            
        # Calcula altura total
        y = margin
        for align, text, font in lines:
            bbox = temp_draw.textbbox((0, 0), text, font=font)
            line_height = bbox[3] - bbox[1]
            y += line_height + line_spacing
            
        y += margin + 100  # Margem inferior + espaço para corte
        
        # Cria imagem final
        img = Image.new('RGB', (paper_width, y), 'white')
        draw = ImageDraw.Draw(img)
        
        # Desenha conteúdo
        y = margin
        for align, text, font in lines:
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            line_height = bbox[3] - bbox[1]
            
            if align == 'center':
                x = (paper_width - text_width) // 2
            elif align == 'right':
                x = paper_width - text_width - margin
            else:  # left
                x = margin
                
            # Garante que o texto seja string e desenha com encoding correto
            text_str = str(text) if not isinstance(text, str) else text
            draw.text((x, y), text_str, font=font, fill='black')
            y += line_height + line_spacing
            
        return img
        
    def _confirm_success(self, command_id):
        """Confirma sucesso da impressão"""
        threading.Thread(target=self._async_confirm, args=(command_id, 'completed', 'Impressão concluída'), daemon=True).start()
        
    def _confirm_error(self, command_id, error_msg):
        """Confirma erro na impressão"""
        threading.Thread(target=self._async_confirm, args=(command_id, 'failed', error_msg), daemon=True).start()
        
    def _async_confirm(self, command_id, status, message):
        """Envia confirmação de forma assíncrona"""
        try:
            self.session.post(
                f"{WORKERS_BASE_URL}/api/print/confirm",
                headers={
                    'X-User-Role': AUTH_ROLE,
                    'X-User-Pin': AUTH_PIN,
                    'Content-Type': 'application/json'
                },
                json={
                    'commandId': command_id,
                    'status': status,
                    'message': message,
                    'timestamp': time.time()
                },
                timeout=10
            )
        except Exception as e:
            print(f"Erro ao confirmar: {e}")

# ============================================================================
# INTERFACE GRÁFICA
# ============================================================================

class PrinterClientApp:
    """Aplicação principal"""
    
    def __init__(self):
        self.config = load_config()
        
        # Cria janela
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")
        
        self.root = ctk.CTk()
        self.root.title("Edienai Printer Client - Tempo Real")
        self.root.geometry("800x600")
        
        # Layout principal
        self._create_ui()
        
        # Componentes de backend
        self.processor = PrintCommandProcessor(self.config, self.log)
        
        # Cliente SSE para comandos manuais (API print)
        self.sse_client = PrinterSSEClient(
            on_command_callback=self.processor.enqueue,
            on_status_callback=self.update_status
        )
        
        # Cliente SSE para pedidos em tempo real (NOVO)
        self.orders_client = OrdersSSEClient(
            on_new_order_callback=self.processor.enqueue_order_auto_print,
            on_status_callback=self.update_orders_status
        )
        
        # Inicia automaticamente
        self.processor.start()
        self.log("✅ Processador de comandos iniciado", "success")

        self.sse_client.start()
        self.log("✅ Cliente SSE (comandos manuais) iniciado", "success")
        
        self.orders_client.start()  # NOVO: Inicia escuta de pedidos
        self.log("✅ Cliente SSE (pedidos automáticos) iniciado", "success")

        self.log("🚀 Sistema iniciado completamente", "success")
        self.log("📡 Escutando pedidos em tempo real na URL:", "info")
        self.log(f"   {WORKERS_BASE_URL}/realtime/orders/stream", "info")

    def _create_ui(self):
        """Cria interface"""
        # Frame superior - Status
        status_frame = ctk.CTkFrame(self.root)
        status_frame.pack(fill="x", padx=10, pady=10)

        ctk.CTkLabel(status_frame, text="Status:", font=("Arial", 14, "bold")).pack(side="left", padx=5)
        self.status_label = ctk.CTkLabel(status_frame, text="🔴 Desconectado", font=("Arial", 14))
        self.status_label.pack(side="left", padx=5)

        # Botão de configurações
        ctk.CTkButton(status_frame, text="⚙️ Configurações", command=self.open_settings, width=150).pack(side="right", padx=5)

        # Frame central - Log
        log_frame = ctk.CTkFrame(self.root)
        log_frame.pack(fill="both", expand=True, padx=10, pady=10)

        ctk.CTkLabel(log_frame, text="Log de Atividades", font=("Arial", 16, "bold")).pack(pady=5)

        self.log_text = scrolledtext.ScrolledText(log_frame, height=20, font=("Consolas", 10))
        self.log_text.pack(fill="both", expand=True, padx=5, pady=5)

        # Frame inferior - Informações
        info_frame = ctk.CTkFrame(self.root)
        info_frame.pack(fill="x", padx=10, pady=10)

        auto_status = f" | Cliente: {'✓' if self.config.get('auto_print_client', True) else '✗'} | Cozinha: {'✓' if self.config.get('auto_print_kitchen', True) else '✗'}"
        info_text = f"Impressora: {self.config['printer_name']} | Papel: {self.config['paper_width']} | Texto: {self.config['text_size']}{auto_status}"
        self.info_label = ctk.CTkLabel(info_frame, text=info_text, font=("Arial", 10))
        self.info_label.pack(pady=5)

    def update_status(self, status):
        """Atualiza status da conexão (API Print)"""
        self.status_label.configure(text=status)
        self.log(status, "info")

    def update_orders_status(self, status):
        """Atualiza status da conexão de pedidos"""
        self.log(f"📱 [Pedidos SSE] {status}", "info")

    def log(self, message, level="info"):
        """Adiciona mensagem ao log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_msg = f"[{timestamp}] {message}\n"

        self.log_text.insert("end", log_msg)
        self.log_text.see("end")

        # Limita tamanho do log
        lines = int(self.log_text.index('end-1c').split('.')[0])
        if lines > 500:
            self.log_text.delete('1.0', '100.0')

    def open_settings(self):
        """Abre diálogo de configurações"""
        settings_window = ctk.CTkToplevel(self.root)
        settings_window.title("Configurações")
        settings_window.geometry("500x550")
        settings_window.transient(self.root)
        settings_window.grab_set()

        # Container
        container = ctk.CTkFrame(settings_window)
        container.pack(fill="both", expand=True, padx=20, pady=20)

        # Impressora
        ctk.CTkLabel(container, text="Nome da Impressora:", font=("Arial", 12, "bold")).grid(row=0, column=0, sticky="w", pady=10)
        printer_entry = ctk.CTkEntry(container, width=300)
        printer_entry.insert(0, self.config['printer_name'])
        printer_entry.grid(row=0, column=1, pady=10)

        # Largura do papel
        ctk.CTkLabel(container, text="Largura do Papel:", font=("Arial", 12, "bold")).grid(row=1, column=0, sticky="w", pady=10)
        paper_var = tk.StringVar(value=self.config['paper_width'])
        paper_menu = ctk.CTkOptionMenu(container, variable=paper_var, values=["58mm", "72mm", "80mm"], width=300)
        paper_menu.grid(row=1, column=1, pady=10)

        # Tamanho do texto
        ctk.CTkLabel(container, text="Tamanho do Texto:", font=("Arial", 12, "bold")).grid(row=2, column=0, sticky="w", pady=10)
        text_var = tk.StringVar(value=self.config['text_size'])
        text_menu = ctk.CTkOptionMenu(container, variable=text_var, values=["pequeno", "normal", "grande", "extra"], width=300)
        text_menu.grid(row=2, column=1, pady=10)

        # Espaçamento
        ctk.CTkLabel(container, text="Espaçamento (px):", font=("Arial", 12, "bold")).grid(row=3, column=0, sticky="w", pady=10)
        spacing_entry = ctk.CTkEntry(container, width=300)
        spacing_entry.insert(0, str(self.config['line_spacing_px']))
        spacing_entry.grid(row=3, column=1, pady=10)

        # Rotação
        ctk.CTkLabel(container, text="Rotação (graus):", font=("Arial", 12, "bold")).grid(row=4, column=0, sticky="w", pady=10)
        rotation_var = tk.StringVar(value=str(self.config.get('rotation_degrees', 90)))
        rotation_menu = ctk.CTkOptionMenu(container, variable=rotation_var, values=["0", "90", "180", "270"], width=300)
        rotation_menu.grid(row=4, column=1, pady=10)

        # Separador
        ctk.CTkLabel(container, text="─" * 50, font=("Arial", 10)).grid(row=5, column=0, columnspan=2, pady=10)

        # Toggle de impressão automática - Cliente
        ctk.CTkLabel(container, text="Impressão Automática:", font=("Arial", 12, "bold")).grid(row=6, column=0, sticky="w", pady=5)

        auto_client_var = tk.BooleanVar(value=self.config.get('auto_print_client', True))
        auto_client_switch = ctk.CTkSwitch(container, text="Imprimir Cliente", variable=auto_client_var, font=("Arial", 11))
        auto_client_switch.grid(row=7, column=0, columnspan=2, sticky="w", pady=5, padx=10)

        # Toggle de impressão automática - Cozinha
        auto_kitchen_var = tk.BooleanVar(value=self.config.get('auto_print_kitchen', True))
        auto_kitchen_switch = ctk.CTkSwitch(container, text="Imprimir Cozinha", variable=auto_kitchen_var, font=("Arial", 11))
        auto_kitchen_switch.grid(row=8, column=0, columnspan=2, sticky="w", pady=5, padx=10)

        def save_settings():
            self.config['printer_name'] = printer_entry.get()
            self.config['paper_width'] = paper_var.get()
            self.config['text_size'] = text_var.get()
            self.config['auto_print_client'] = auto_client_var.get()
            self.config['auto_print_kitchen'] = auto_kitchen_var.get()
            try:
                self.config['line_spacing_px'] = int(spacing_entry.get())
                self.config['rotation_degrees'] = int(rotation_var.get())
            except:
                pass

            if save_config(self.config):
                self.log("✅ Configurações salvas", "success")
                auto_status = f" | Cliente: {'✓' if self.config['auto_print_client'] else '✗'} | Cozinha: {'✓' if self.config['auto_print_kitchen'] else '✗'}"
                self.info_label.configure(text=f"Impressora: {self.config['printer_name']} | Papel: {self.config['paper_width']} | Texto: {self.config['text_size']}{auto_status}")
                settings_window.destroy()
            else:
                messagebox.showerror("Erro", "Falha ao salvar configurações")

        # Botões
        btn_frame = ctk.CTkFrame(settings_window)
        btn_frame.pack(fill="x", padx=20, pady=20)

        ctk.CTkButton(btn_frame, text="Salvar", command=save_settings, width=150).pack(side="left", padx=5)
        ctk.CTkButton(btn_frame, text="Cancelar", command=settings_window.destroy, width=150).pack(side="right", padx=5)

    def run(self):
        """Inicia aplicação"""
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.root.mainloop()

    def on_close(self):
        """Fecha aplicação"""
        self.sse_client.stop()
        self.orders_client.stop()  # NOVO: Para escuta de pedidos
        self.processor.stop()
        self.root.destroy()

# ============================================================================
# PONTO DE ENTRADA
# ============================================================================

if __name__ == "__main__":
    try:
        app = PrinterClientApp()
        app.run()
    except Exception as e:
        messagebox.showerror("Erro Fatal", f"Erro ao iniciar aplicação:\n{e}")
        sys.exit(1)
