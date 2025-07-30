import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const generateColor = (index) => {
  const colors = [
    "#93c5fd", "#fca5a5", "#6ee7b7", "#fcd34d",
    "#c4b5fd", "#fdba74", "#67e8f9", "#f9a8d4",
    "#a5f3fc", "#bef264"
  ];
  return colors[index % colors.length];
};

export default function CortePlanner() {
  const [pieces, setPieces] = useState([]);
  const [newPiece, setNewPiece] = useState({ largura: "", altura: "", quantidade: "" });
  const [sheets, setSheets] = useState([]);
  const [newSheet, setNewSheet] = useState({ largura: "", altura: "", espessura: "" });
  const [kerf, setKerf] = useState("3");
  const [optimizedCuts, setOptimizedCuts] = useState([]);
  const pdfRef = useRef();

  const addPiece = () => {
    if (!newPiece.largura || !newPiece.altura || !newPiece.quantidade) return;
    setPieces([...pieces, newPiece]);
    setNewPiece({ largura: "", altura: "", quantidade: "" });
  };

  const addSheet = () => {
    if (!newSheet.largura || !newSheet.altura || !newSheet.espessura) return;
    setSheets([...sheets, newSheet]);
    setNewSheet({ largura: "", altura: "", espessura: "" });
  };

  const generateOptimizedCut = () => {
    const kerfValue = parseFloat(kerf);
    let piecesList = [];
    pieces.forEach((p, typeIndex) => {
      for (let i = 0; i < parseInt(p.quantidade); i++) {
        piecesList.push({
          largura: parseFloat(p.largura),
          altura: parseFloat(p.altura),
          typeIndex
        });
      }
    });

    const cuts = [];
    let remainingPieces = [...piecesList];

    sheets.forEach((sheet, sheetIndex) => {
      let sheetWidth = parseFloat(sheet.largura);
      let sheetHeight = parseFloat(sheet.altura);
      let used = [];

      for (let y = 0; y < sheetHeight && remainingPieces.length > 0;) {
        let rowHeight = 0;
        let x = 0;

        for (let i = 0; i < remainingPieces.length;) {
          const p = remainingPieces[i];
          if (
            x + p.largura <= sheetWidth &&
            y + p.altura <= sheetHeight
          ) {
            used.push({ ...p, x, y, sheetIndex });
            x += p.largura + kerfValue;
            rowHeight = Math.max(rowHeight, p.altura);
            remainingPieces.splice(i, 1);
          } else {
            i++;
          }
        }
        y += rowHeight + kerfValue;
      }

      if (used.length > 0) {
        cuts.push({ sheet: sheetIndex + 1, width: sheetWidth, height: sheetHeight, used });
      }
    });

    setOptimizedCuts(cuts);
  };

  const exportPDF = async () => {
    const canvas = await html2canvas(pdfRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.setFontSize(16);
    pdf.text("Plano de Corte - " + new Date().toLocaleDateString(), 20, 30);
    pdf.addImage(imgData, "PNG", 0, 40, width, height);
    pdf.addPage();

    const totalPecas = pieces.reduce((acc, p) => acc + parseInt(p.quantidade), 0);
    pdf.setFontSize(14);
    pdf.text("Resumo do Plano de Corte", 20, 40);
    pdf.setFontSize(12);
    pdf.text(`Total de chapas utilizadas: ${optimizedCuts.length}`, 20, 70);
    pdf.text(`Total de peças otimizadas: ${totalPecas}`, 20, 90);

    pieces.forEach((p, idx) => {
      pdf.setFillColor(generateColor(idx));
      pdf.rect(20, 110 + idx * 20, 10, 10, 'F');
      pdf.text(`${p.largura} x ${p.altura} (${p.quantidade}x)`, 40, 120 + idx * 20);
    });

    pdf.save("plano_de_corte.pdf");
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Plano de Corte - Protótipo</h1>

      {/* Resultado da Otimização */}
      {optimizedCuts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Visualização Gráfica do Corte</h2>

            <div ref={pdfRef} className="space-y-6">
              {optimizedCuts.map((cut, index) => (
                <div key={index}>
                  <h3 className="font-semibold mb-2">Chapa #{cut.sheet}</h3>
                  <div
                    className="relative border border-gray-300 bg-white"
                    style={{
                      width: "100%",
                      aspectRatio: `${cut.width} / ${cut.height}`,
                      maxHeight: "400px",
                      overflow: "hidden"
                    }}
                  >
                    {cut.used.map((p, idx) => (
                      <div
                        key={idx}
                        className="absolute border text-xs text-center overflow-hidden"
                        style={{
                          left: `${(p.x / cut.width) * 100}%`,
                          top: `${(p.y / cut.height) * 100}%`,
                          width: `${(p.largura / cut.width) * 100}%`,
                          height: `${(p.altura / cut.height) * 100}%`,
                          backgroundColor: generateColor(p.typeIndex),
                          borderColor: "#333",
                          color: "#000",
                        }}
                      >
                        {p.largura} x {p.altura}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 mt-4">
                {pieces.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: generateColor(idx) }}
                    ></div>
                    {p.largura} x {p.altura} ({p.quantidade}x)
                  </div>
                ))}
              </div>
            </div>

            <Button className="mt-4" onClick={exportPDF}>
              Exportar PDF
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
