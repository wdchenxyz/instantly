import { ActionPanel, List, Action, Icon, LocalStorage, useNavigation, showToast, Toast, Form } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

// Type for your item
type Item = {
  id: string;
  title: string;
  url: string;
  icon: string;
};

// Helper to load items from LocalStorage
async function loadItems(): Promise<Item[]> {
  const data = await LocalStorage.getItem<string>("items");
  return data ? JSON.parse(data) : [];
}

// Helper to save items to LocalStorage
async function saveItems(items: Item[]) {
  await LocalStorage.setItem("items", JSON.stringify(items));
}

export default function Command() {
  const { data: items = [], isLoading, revalidate } = useCachedPromise(loadItems, [], { keepPreviousData: true });
  const { push } = useNavigation();

  function handleAddItem() {
    push(<AddItem onItemAdded={revalidate} />);
  }

  function handleEditItem(item: Item) {
    push(<EditItem item={item} onItemEdited={revalidate} />);
  }

  async function handleDeleteItem(id: string) {
    try {
      const newItems = items.filter((item) => item.id !== id);
      await saveItems(newItems);
      revalidate();
      await showToast(Toast.Style.Success, "Item deleted");
    } catch {
      await showToast(Toast.Style.Failure, "Failed to delete item");
    }
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Add Item"
            icon={Icon.Plus}
            onAction={handleAddItem}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No items yet" description="Press ⌘+N to add a new one" icon={Icon.PlusCircle} />
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          icon={item.icon as Icon}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} title="Open URL" />
              <Action
                title="Add Item"
                icon={Icon.Plus}
                onAction={handleAddItem}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Edit Item"
                icon={Icon.Pencil}
                onAction={() => handleEditItem(item)}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteItem(item.id)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Form component for adding new items
function AddItem({ onItemAdded }: { onItemAdded: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { title: string; url: string; icon: string }) {
    if (!values.title.trim() || !values.url.trim()) {
      await showToast(Toast.Style.Failure, "Title and URL cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const items = await loadItems();
      const newItem: Item = { id: uuidv4(), title: values.title, url: values.url, icon: values.icon };
      await saveItems([...items, newItem]);
      await showToast(Toast.Style.Success, "Item added");
      onItemAdded();
      pop();
    } catch {
      await showToast(Toast.Style.Failure, "Failed to add item");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter item title" />
      <Form.TextField id="url" title="URL" placeholder="https://example.com" />
      <Form.Dropdown id="icon" title="Icon" defaultValue="cloud-16">
        {Object.entries(Icon).map(([key, value]) => (
          <Form.Dropdown.Item key={key} value={value} title={key} icon={value as Icon} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

// Form component for editing existing items
function EditItem({ item, onItemEdited }: { item: Item; onItemEdited: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { title: string; url: string; icon: string }) {
    if (!values.title.trim() || !values.url.trim()) {
      await showToast(Toast.Style.Failure, "Title and URL cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const items = await loadItems();
      const newItems = items.map((i) => (i.id === item.id ? { ...item, ...values } : i));
      await saveItems(newItems);
      await showToast(Toast.Style.Success, "Item updated");
      onItemEdited();
      pop();
    } catch {
      await showToast(Toast.Style.Failure, "Failed to update item");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={item.title} />
      <Form.TextField id="url" title="URL" defaultValue={item.url} />
      <Form.Dropdown id="icon" title="Icon" defaultValue={item.icon}>
        {Object.entries(Icon).map(([key, value]) => (
          <Form.Dropdown.Item key={key} value={value} title={key} icon={value as Icon} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
