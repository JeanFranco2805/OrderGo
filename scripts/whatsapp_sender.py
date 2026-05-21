import sys
import json
import time
import webbrowser
import urllib.parse
import pyautogui
import pygetwindow as gw

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.3

def focus_browser_window():
    """Busca y activa la ventana del navegador con WhatsApp Web."""
    for w in gw.getAllWindows():
        title = w.title.lower()
        if any(k in title for k in ['whatsapp', 'chrome', 'edge', 'brave', 'firefox', 'opera']):
            try:
                if w.isMinimized:
                    w.restore()
                w.maximize()
                w.activate()
                return True
            except Exception:
                continue
    return False

def send_single_message(phone: str, message: str, is_first: bool = True):
    """Envía un mensaje a un número usando WhatsApp Web."""
    if not phone.startswith('+'):
        phone = '+' + phone

    encoded_msg = urllib.parse.quote(message)
    url = f"https://web.whatsapp.com/send?phone={phone[1:]}&text={encoded_msg}"

    if is_first:
        print(f"[1/4] Abriendo WhatsApp Web para {phone}...")
        webbrowser.open(url, new=1)
    else:
        print(f"[1/4] Abriendo NUEVA pestaña para {phone}...")
        webbrowser.open(url, new=2)  # new=2 fuerza nueva pestaña

    # Esperar a que cargue WhatsApp Web (más tiempo para sincronizar)
    wait_time = 20 if is_first else 18
    print(f"  Esperando carga ({wait_time}s)...")
    time.sleep(wait_time)

    # Activar ventana del navegador
    print("[2/4] Activando navegador...")
    if not focus_browser_window():
        print("  [WARN] No se encontró ventana del navegador.")
    time.sleep(2)

    # Hacer click en el campo de texto de WhatsApp Web
    print("[3/4] Haciendo click en el input de texto...")
    screen_width, screen_height = pyautogui.size()
    # El input de WhatsApp Web está en la parte inferior, centrado horizontalmente
    input_x = screen_width // 2
    input_y = screen_height - 100

    pyautogui.click(input_x, input_y)
    time.sleep(1)

    # Forzar focus en el input y activar el botón de enviar
    print("[4/4] Enviando mensaje...")
    pyautogui.press('space')
    time.sleep(0.3)
    pyautogui.press('backspace')
    time.sleep(0.3)
    pyautogui.press('enter')
    time.sleep(2)

    print("  [OK] Mensaje enviado.")
    return True

def send_batch(messages: list):
    """Envía múltiples mensajes secuencialmente."""
    total = len(messages)
    sent = 0
    failed = 0

    for i, msg in enumerate(messages):
        phone = msg.get('phone', '')
        message = msg.get('message', '')

        print(f"\n[{i+1}/{total}] Enviando a {phone}...")
        try:
            send_single_message(phone, message, is_first=(i == 0))
            sent += 1

            # Delay entre mensajes para no saturar ni desloguear WhatsApp
            if i < total - 1:
                delay = 10
                print(f"  Esperando {delay}s antes del siguiente...")
                time.sleep(delay)
        except Exception as e:
            print(f"  [ERROR] Falló el envío: {e}")
            failed += 1

    print(f"\n[RESUMEN] Total: {total}, Enviados: {sent}, Fallidos: {failed}")
    return sent, failed

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python whatsapp_sender.py <phone> <message>")
        print("  python whatsapp_sender.py --batch <json_file>")
        sys.exit(1)

    if sys.argv[1] == '--batch':
        if len(sys.argv) < 3:
            print("Debes proporcionar la ruta del archivo JSON.")
            sys.exit(1)
        json_path = sys.argv[2]
        with open(json_path, 'r', encoding='utf-8') as f:
            messages = json.load(f)
        send_batch(messages)
    else:
        if len(sys.argv) < 3:
            print("Uso: python whatsapp_sender.py <phone> <message>")
            sys.exit(1)
        phone = sys.argv[1]
        message = sys.argv[2]
        send_single_message(phone, message)
