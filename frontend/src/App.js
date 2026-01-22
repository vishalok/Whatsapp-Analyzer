import { useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import "./App.css";

function App() {
  const [data, setData] = useState(null);

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await axios.post("http://localhost:5000/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert("Error processing file. Please check the file format.");
    }
  };
const formatDateIndian = (dateStr) => {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0"); 
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

  const exportCSV = () => {
    if (!data) return;
    let csv = "Date,Active Users,Joined Users\n";
data.graph.forEach(row => csv += `${formatDateIndian(row.date)},${row.active},${row.joined}\n`);
    csv += "\nUsers Active >= 4 Days\n";
    data.active4days.forEach(u => csv += `${u}\n`);


    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "whatsapp_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
 
  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(14);
    doc.text("WhatsApp Chat Analysis Report", 10, y);
    y += 10;
    doc.setFontSize(12);
    doc.text("Last 7 Days Metrics:", 10, y);
    y += 8;

    data.graph.forEach(row => {
      doc.text(`${formatDateIndian(row.date)} - Active: ${row.active}, Joined: ${row.joined}`, 10, y);
      y += 7;
    });

    y += 10;
    doc.text("Users Active >= 4 Days:", 10, y);
    y += 8;
    data.active4days.forEach(u => {
      doc.text(`- ${u}`, 10, y);
      y += 7;
    });

    doc.save("whatsapp_report.pdf");
  };

  return (
    <div className="container">
      <h2>WhatsApp Chat Analyzer</h2>
      <div className="file-upload">
        <input type="file" onChange={uploadFile} />
      </div>

      {data && (
        <>
          <div className="chart-wrapper">
            <BarChart width={800} height={350} data={data.graph}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date"   tickFormatter={formatDateIndian} interval={0} />
              <YAxis />
              <Tooltip labelFormatter={formatDateIndian} />
              <Legend />
              <Bar dataKey="active" fill="#4f8df7" />
              <Bar dataKey="joined" fill="#f5a623" />
            </BarChart>
          </div>

          <div>
            <button onClick={exportCSV}>Export CSV</button>
            <button onClick={exportPDF}>Export PDF</button>
          </div>

          <h3>Users Active ≥ 4 Days</h3>
          <ul className="users-active">
            {data.active4days.map(u => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
