import React, { useRef, useState, useCallback, useEffect } from "react";
import type { Document } from "@/types";
import { CropModal } from "@/components/CropModal";
import  { DocumentModal } from "@/components/DocumentModal";
import { DocumentCard } from "@/components/DocumentCard";
import { MetadataCard } from "@/components/MetaDataModal";


interface ScanPageProps {
  localDocuments?: Document[];
  onAdd: (
    name: string,
    dataUrl: string,
    type: Document["type"],
    tags?: string[],
  ) => void;
  onDelete: (id: string) => void;
  onView: (document: Document) => void;
}

export const ScanPage = React.memo<ScanPageProps>(
  ({ localDocuments, onAdd, onDelete , onView}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nativeCameraInputRef = useRef<HTMLInputElement>(null);
    const nativeInputRef = useRef<HTMLInputElement>(null);

    const [fileSelect, setFileSelect] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [captured, setCaptured] = useState<string | null>(null);
    const [cropping, setCropping] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [closeModal,setCloseModal ]=useState(false)

    const [docName, setDocName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);


    const handleOpenMetadataModal = () => {
      setCloseModal(false);
    }

    const startCamera = useCallback(async () => {
      setError(null);
      setSaved(false);

      const isAndroid = /Android/i.test(navigator.userAgent);

      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        const detail = isAndroid
          ? "Auf Android ist die Kamera in dieser Web-App nicht verfügbar. Bitte die App über Chrome/Edge mit Kamera-Berechtigung öffnen oder eine native App nutzen."
          : "Diese Browser-Version unterstützt keine Kamerazugriffe über die Web-API.";
        setError(detail);
        return;
      }

      const requestCamera = async (
        facingMode: "user" | "environment" | undefined,
      ) => {
        const constraints: MediaStreamConstraints = {
          video: facingMode
            ? { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
        };

        return navigator.mediaDevices.getUserMedia(constraints);
      };

      try {
        const stream = await requestCamera("environment");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreaming(true);
          setCaptured(null);
        }
      } catch (environmentError) {
        try {
          const stream = await requestCamera("user");
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setStreaming(true);
            setCaptured(null);
          }
        } catch (userError) {
          const message =
            userError instanceof Error && userError.message
              ? userError.message
              : "Bitte Kamerazugriff im Browser erlauben.";
          const androidHint = /Android/i.test(navigator.userAgent)
            ? " Auf Android kann das auch an fehlender Browser-Berechtigung oder an der Web-App-Umgebung liegen."
            : "";
          setError(
            `Kamera konnte nicht gestartet werden: ${message}${androidHint}`,
          );
        }
      }
    }, []);

    const stopCamera = useCallback(() => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setStreaming(false);
    }, []);
    // processFiles function to handle file uploads
    const processFiles = useCallback((files: FileList | null) => {
      if (!files) return;
      Array.from(files)
        .filter(
          (f) => f.type.startsWith("image/") || f.type === "application/pdf",
        )
        .forEach((file) => {
          const reader = new FileReader();
          const name =
            file.name.trim() ||
            `Scan ${new Date().toLocaleDateString("de-DE")}`;
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            // setPreviews((prev) => [...prev, { file, dataUrl }]);
            const tagList: string[] = [];
            onAdd(name, dataUrl, "upload", tagList);
            setFileSelect(false);
          };
          reader.readAsDataURL(file);
        });
    }, []);
    //  handleDrop function to handle drag-and-drop file uploads
    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        processFiles(e.dataTransfer.files);
      },
      [processFiles],
    );

    const handleNativeCameraCapture = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        stopCamera();
        setError(null);
        setSaved(false);

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          dataUrl.startsWith("data:application/pdf")
            ? setCropping(false)
            : setCropping(true);
        };
        reader.readAsDataURL(file);
        file.type.startsWith("image/") ? setCropping(true) : setCropping(false);
        event.target.value = "";
      },
      [stopCamera],
    );

    useEffect(() => {
      return () => {
        stopCamera();
      };
    }, [stopCamera]);

    const capture = useCallback(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      stopCamera();
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCaptured(dataUrl);
      setCropping(true);
    }, [stopCamera]);

    const handleCropConfirm = useCallback((croppedUrl: string) => {
      setCaptured(croppedUrl);
      setCropping(false);
    }, []);

    const handleCropCancel = useCallback(() => {
      setCaptured(null);
      setCropping(false);
    }, []);

    const handleSave = () => {
      if (!captured) return;
      const name =
        docName.trim() || `Scan ${new Date().toLocaleDateString("de-DE")}`;
      // const freeTagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      // const metadataTags = [
      //   ...(selectedYear ? [`Jahr:${selectedYear}`] : []),
      //   ...(selectedCategory ? [`Kategorie:${selectedCategory}`] : []),
      // ];
      // const tagList = Array.from(new Set([...metadataTags]));
      const tagList: string[] = [];

      onAdd(name, captured, "scan", tagList);
      setDocName("");
      // setTags('')
      // setSelectedYear("");
      // setSelectedCategory("");
      setCaptured(null);
      setSaved(true);
    };

    const handleRetake = () => {
      setCaptured(null);
      setSaved(false);
      startCamera();
    };

    return (
      <div
        className="modal d-block"
        tabIndex={-1}
        style={{ background: "rgba(0,0,0,0.7)" }}
        
      >
      <div className="container py-4" style={{ maxWidth: 1040 }}>
        <h2 className="mb-4">📷 Dokument scannen</h2>

        {error && <div className="alert alert-danger">{error}</div>}
        {saved && (
          <div className="alert alert-success">✅ Dokument gespeichert!</div>
        )}

        <div
          className="position-relative mb-3 bg-black rounded overflow-hidden"
          style={{ minHeight: 240 }}
        >
          <video
            ref={videoRef}
            className="w-100 d-block"
            autoPlay
            playsInline
            muted
            style={{
              display: streaming ? "block" : "none",
              maxHeight: 480,
              objectFit: "contain",
            }}
          />
          {streaming && <div className="scan-overlay" />}
          {captured && !cropping && (
            <img
              src={captured}
              alt="Vorschau"
              className="w-100 d-block"
              style={{ maxHeight: 480, objectFit: "contain" }}
            />
          )}
          {!streaming && !captured && (
            <div
              className="d-flex align-items-center justify-content-center"
              style={{ minHeight: 240 }}
            >
              <span className="text-muted">📷 Kamera noch nicht aktiv</span>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="d-none" />

        {!streaming && !captured && (
          <div className="d-flex flex-column gap-2 mb-3">
            <button className="btn btn-primary w-100" onClick={startCamera}>
              📷 Kamera starten
            </button>
            <button
              className="btn btn-outline-secondary w-100"
              onClick={() => nativeCameraInputRef.current?.click()}
            >
              📸 Native Android-Kamera öffnen
            </button>
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*||applivation/pdf"
              capture="environment"
              className="d-none"
              onChange={handleNativeCameraCapture}
            />
            <button
              className="btn btn-primary w-100"
              onClick={() => {
                setFileSelect(true);
                // nativeInputRef.current?.click();
              }}
            >
              📷 Dokument hochladen
            </button>
            {fileSelect && (
              <div
                className={`rounded p-5 text-center mb-4 ${dragging ? "bg-primary bg-opacity-10 border border-primary" : "border border-secondary"}`}
                style={{ borderStyle: "dashed", cursor: "pointer" }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => {
                  nativeInputRef.current?.click();
                }}
              >
                <div className="display-4 mb-2">📂</div>
                <p className="mb-1 fw-semibold">
                  Bilder oder PDFs hierher ziehen oder klicken
                </p>
                <small className="text-muted">
                  JPG, PNG, WebP, GIF oder PDF – mehrere Dateien möglich
                </small>
                <input
                  ref={nativeInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="d-none"
                  onChange={(e) => processFiles(e.target.files)}
                />
              </div>
            )}
          </div>
        )}

        {streaming && (
          <div className="d-flex gap-2 mb-3">
            <button className="btn btn-success flex-fill" onClick={capture}>
              📸 Aufnehmen
            </button>
            <button className="btn btn-secondary" onClick={stopCamera}>
              ✕ Abbrechen
            </button>
          </div>
        )}

        {captured && !cropping && (
          <div className="card p-3">
            {/* <div className="mb-3">
              <label className="form-label fw-semibold">Aussteller</label>
              <input
                type="text"
                className="form-control"
                placeholder={`Scan ${new Date().toLocaleDateString("de-DE")}`}
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Jahr</label>
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Kategorie</label>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div> */}

            <div className="d-flex gap-2">
              <button
                className="btn btn-success flex-fill"
                onClick={handleSave}
              >
                💾 Übernehmen
              </button>
              <button
                className="btn btn-outline-primary"
                onClick={() => setCropping(true)}
                title="Erneut zuschneiden"
              >
                ✂️ Zuschneiden
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={handleRetake}
              >
                🔄 Neu aufnehmen
              </button>
            </div>
          </div>
        )}

        {cropping && (
          <CropModal
            imageSrc={captured}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        )}
        {localDocuments?.length !== 0 ? (
          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-3">
            {localDocuments?.map((doc) => (
              <div key={doc.id} className="col">
                <DocumentCard
                  document={doc}
                  onDelete={(id) => {
                    onDelete(id);
                    setSelectedDoc(doc);
                  }}
                  onRename={() => {
                    // onRename(id);
                    setSelectedDoc(doc);
                  }}
                  onView={() => onView(doc)}
                />
              </div>
            ))}
          </div>
        ) : null}
        <div className="d-flex gap-3 mt-3">
          <button className="btn btn-success" onClick={handleOpenMetadataModal}>
            💾 Speichern und hochladen
          </button>
          <button className="btn btn-outline-secondary" onClick={handleRetake}>
            🔄 Abbrechen
          </button>
        </div>
             {!closeModal?(
               <MetadataCard documents={[]} onClose={() => setCloseModal(true)} />
             ):null}
        
      </div>
      </div>
    );
  },
);

ScanPage.displayName = "ScanPage";
