export function generateQRCode(text, element) {

    element.innerHTML = "";

    new QRCode(element, {
        text: text,
        width: 256,
        height: 256
    });

}