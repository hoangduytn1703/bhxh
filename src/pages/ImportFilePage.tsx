import { useState } from "react";
import { UploadCloud, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Link, useNavigate } from "react-router"; // eslint-disable-line

export default function ImportFilePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [importedData, setImportedData] = useState<any[]>([]);
  const navigate = useNavigate();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    setUploadStatus("idle");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const parsedPeriods: any[] = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          const parts = trimmed.split(',').map(p => p.trim());
          if (parts.length >= 3) {
            const [start, end, salary] = parts;
            const [startYear, startMonth] = start.split('-');
            const [endYear, endMonth] = end.split('-');
            
            parsedPeriods.push({
              startMonth: parseInt(startMonth),
              startYear: parseInt(startYear),
              endMonth: parseInt(endMonth),
              endYear: parseInt(endYear),
              salary: parseInt(salary),
              contributionType: "mandatory"
            });
          }
        }

        if (parsedPeriods.length > 0) {
          setImportedData(parsedPeriods);
          setUploadStatus("success");
        } else {
          setUploadStatus("error");
        }
      } catch (err) {
        setUploadStatus("error");
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      setUploadStatus("error");
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  const handleImportToForm = () => {
    localStorage.setItem('imported_periods', JSON.stringify(importedData));
    navigate('/bhxh-1-lan');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-slate-800">Import Dữ Liệu Nhanh</h1>
        <p className="text-slate-500">
          Tải lên file định dạng chữ (.txt hoặc .csv) để nhập nhanh nhiều giai đoạn đóng BHXH.<br/>
          Định dạng mỗi dòng: <code className="bg-slate-100 px-1 font-mono text-sm text-slate-600 rounded">YYYY-MM, YYYY-MM, LUONG</code>
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Tải lên file văn bản</h3>
        
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 p-12 text-center hover:bg-slate-100 transition-colors cursor-pointer group relative">
          <div className="py-4 px-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:-translate-y-2 transition-transform mb-6">
            <UploadCloud className="h-10 w-10 text-blue-500" />
          </div>
          <p className="text-slate-800 font-bold text-lg mb-2">Click hoặc kéo thả file Text/CSV vào đây</p>
          <p className="text-slate-400 text-sm mb-6">Ví dụ: 2020-01, 2021-12, 12000000</p>
          
          <Button type="button" className="pointer-events-none rounded-xl" size="lg">Chọn file văn bản</Button>
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            onChange={handleFileUpload}
            accept=".txt,.csv"
          />
        </div>

        {isUploading && (
          <div className="mt-6 flex flex-col items-center justify-center p-6 bg-blue-50 border border-blue-100 rounded-2xl animate-pulse">
             <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
             <p className="text-blue-700 font-semibold text-sm">Đang phân tích dữ liệu văn bản...</p>
          </div>
        )}

        {uploadStatus === "success" && !isUploading && (
          <div className="mt-6 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                 <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-900 mb-1">Đọc file thành công!</p>
                <p className="text-sm text-emerald-700">Đã nhận diện được <strong>{importedData.length}</strong> giai đoạn đóng BHXH.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-100 p-4 max-h-40 overflow-y-auto">
               {importedData.map((d, i) => (
                 <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-slate-50 last:border-0">
                   <div className="text-slate-600 font-mono">
                     {d.startYear}-{String(d.startMonth).padStart(2, '0')} <span className="text-slate-400">→</span> {d.endYear}-{String(d.endMonth).padStart(2, '0')}
                   </div>
                   <div className="font-bold text-slate-800">
                     {new Intl.NumberFormat('vi-VN').format(d.salary)} VNĐ
                   </div>
                 </div>
               ))}
            </div>
            
            <div className="flex gap-3 pt-2">
               <Button onClick={handleImportToForm} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm shadow-emerald-200/50 text-sm h-9">
                 Điền vào Tính BHXH 1 Lần
               </Button>
            </div>
          </div>
        )}

        {uploadStatus === "error" && !isUploading && (
          <div className="mt-6 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
               <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-900 mb-1">Định dạng không hợp lệ</p>
              <p className="text-sm text-red-700">File văn bản không đúng cấu trúc dòng. Vui lòng đảm bảo các dòng trống bị xóa và định dạng là YYYY-MM, YYYY-MM, LƯƠNG.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
