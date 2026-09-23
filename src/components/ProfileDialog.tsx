import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Pencil, Plus, UserRound, UsersRound, X } from "lucide-react";
import type { Profile } from "../domain/types";

function profileInitial(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase("vi") ?? "?";
}

export function ProfileDialog({
  profiles,
  activeProfileId,
  required,
  busy,
  error,
  onSelect,
  onCreate,
  onRename,
  onClose,
}: {
  profiles: Profile[];
  activeProfileId: string;
  required: boolean;
  busy: boolean;
  error: string;
  onSelect: (profileId: string) => void;
  onCreate: (name: string) => void;
  onRename: (profileId: string, name: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const canCloseRef = useRef(!required && !busy);
  const onCloseRef = useRef(onClose);
  canCloseRef.current = !required && !busy;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (editingProfileId) renameInputRef.current?.focus();
  }, [editingProfileId]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canCloseRef.current) onCloseRef.current();
      if (event.key !== "Tab") return;
      const items = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled)",
        ) ?? [],
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    onCreate(name);
  }

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    if (!editingProfileId || !editingName.trim() || busy) return;
    if (await onRename(editingProfileId, editingName)) {
      setEditingProfileId("");
      setEditingName("");
    }
  }

  return (
    <div
      className="profile-dialog-backdrop"
      role="presentation"
      onMouseDown={() => !required && !busy && onClose()}
    >
      <section
        ref={dialogRef}
        className="profile-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="profile-dialog-heading">
          <span className="profile-dialog-icon"><UsersRound size={22} /></span>
          <div>
            <span className="eyebrow">HỒ SƠ TRÊN THIẾT BỊ</span>
            <h1 id="profile-dialog-title">Ai đang luyện tập?</h1>
            <p>Mỗi profile có lộ trình, kết quả và tùy chọn riêng.</p>
          </div>
          {!required && (
            <button className="icon-button" aria-label="Đóng danh sách profile" disabled={busy} onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="profile-list" role="list" aria-label="Danh sách profile">
          {profiles.map((profile) => {
            const active = profile.id === activeProfileId;
            return (
              <div
                key={profile.id}
                className={`profile-card ${active ? "active" : ""}`}
                role="listitem"
              >
                <button
                  type="button"
                  className="profile-card-select"
                  disabled={busy}
                  onClick={() => onSelect(profile.id)}
                >
                  <span className="profile-card-avatar">{profileInitial(profile.name)}</span>
                  <span>
                    <strong>{profile.name}</strong>
                    <small>{active ? "Profile đang dùng" : "Chọn profile này"}</small>
                  </span>
                  {busy && active ? <LoaderCircle className="spin" size={17} /> : active ? <Check size={17} /> : <UserRound size={17} />}
                </button>
                <button
                  type="button"
                  className="profile-rename-button"
                  aria-label={`Đổi tên profile ${profile.name}`}
                  title="Đổi tên"
                  disabled={busy}
                  onClick={() => {
                    setCreating(false);
                    setEditingProfileId(profile.id);
                    setEditingName(profile.name);
                  }}
                >
                  <Pencil size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {error && <p className="profile-dialog-error" role="alert">{error}</p>}

        {editingProfileId ? (
          <form className="profile-create-form" onSubmit={(event) => void submitRename(event)}>
            <label htmlFor="profile-rename">Đổi tên profile</label>
            <div>
              <input
                ref={renameInputRef}
                id="profile-rename"
                value={editingName}
                maxLength={40}
                autoComplete="off"
                disabled={busy}
                onChange={(event) => setEditingName(event.target.value)}
              />
              <button className="button button-primary" type="submit" disabled={busy || !editingName.trim()}>
                {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                Lưu tên mới
              </button>
            </div>
            <button type="button" className="profile-cancel-create" disabled={busy} onClick={() => { setEditingProfileId(""); setEditingName(""); }}>
              Hủy
            </button>
          </form>
        ) : creating ? (
          <form className="profile-create-form" onSubmit={submit}>
            <label htmlFor="profile-name">Tên profile mới</label>
            <div>
              <input
                ref={inputRef}
                id="profile-name"
                value={name}
                maxLength={40}
                autoComplete="off"
                placeholder="Ví dụ: Minh Anh"
                disabled={busy}
                onChange={(event) => setName(event.target.value)}
              />
              <button className="button button-primary" type="submit" disabled={busy || !name.trim()}>
                {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
                Tạo và sử dụng
              </button>
            </div>
            <button type="button" className="profile-cancel-create" disabled={busy} onClick={() => { setCreating(false); setName(""); }}>
              Hủy
            </button>
          </form>
        ) : (
          <button type="button" className="profile-add-button" disabled={busy} onClick={() => { setEditingProfileId(""); setCreating(true); }}>
            <Plus size={18} /> Tạo profile mới
          </button>
        )}
        <p className="profile-local-note">Profile và tiến độ chỉ được lưu trong trình duyệt trên thiết bị này.</p>
      </section>
    </div>
  );
}
