export function generateQRCode(text, element) {

    element.innerHTML = "";

    new QRCode(element, {
        text: text,
        width: 256,
        height: 256
    });

}

export function downloadQRCode(element, filename) {

    const canvas = element.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();

}