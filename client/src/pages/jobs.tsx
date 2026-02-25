import { useJobs, useCreateJob, useCustomers, useUpdateJob, useDeleteJob } from "@/hooks/use-business-data";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Search, CheckCircle2, CircleDashed, Clock, XCircle, Image as ImageIcon, Upload, Trash2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobSchema, type JobImage } from "@shared/schema";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_CATEGORIES = [
  "Interior painting",
  "Exterior painting",
  "Repaint",
  "Sculpture/Idol painting",
];

const formSchema = insertJobSchema.extend({
  jobName: z.string().min(1),
  quotedAmount: z.coerce.number(),
  agreedAmount: z.coerce.number(),
  paidAmount: z.coerce.number(),
  customerId: z.coerce.number(),
  category: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

function JobGallery({ jobId }: { jobId: number }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: images, refetch } = useQuery<JobImage[]>({
    queryKey: ["/api/jobs", jobId, "images"],
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("image", file);

    setUploading(true);

    try {
      await fetch(`/api/jobs/${jobId}/images`, {
        method: "POST",
        body: form,
        credentials: "include",
      });

      await refetch();

      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="font-semibold">Project Gallery</h3>
        <div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleUpload}
          />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Photo"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {images?.map((img) => (
          <img key={img.id} src={img.url} className="rounded border" />
        ))}
      </div>
    </div>
  );
}

export default function JobsPage() {

  const { data: jobs, isLoading } = useJobs();
  const { data: customers } = useCustomers();

  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const [categories, setCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("paintbiz_categories");

    if (saved) {
      setCategories([...DEFAULT_CATEGORIES, ...JSON.parse(saved)]);
    } else {
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  const saveCategories = (list: string[]) => {
    const custom = list.filter(c => !DEFAULT_CATEGORIES.includes(c));
    localStorage.setItem("paintbiz_categories", JSON.stringify(custom));
  };

  const handleAddCustomCategory = () => {
    if (!customCategory) return;

    if (!categories.includes(customCategory)) {
      const updated = [...categories, customCategory];
      setCategories(updated);
      saveCategories(updated);
    }

    setCustomCategory("");
    setShowCustomInput(false);
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobName: "",
      category: "Interior painting",
      description: "",
      location: "",
      status: "quoted",
      quotedAmount: 0,
      agreedAmount: 0,
      paidAmount: 0,
      customerId: undefined,
      startDate: "",
      endDate: "",
    }
  });

  const onSubmit = (data: FormValues) => {
    const formatted = {
      ...data,
      quotedAmount: data.quotedAmount.toString(),
      agreedAmount: data.agreedAmount.toString(),
      paidAmount: data.paidAmount.toString(),
    };

    createJob.mutate(formatted, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between">
        <h2 className="text-3xl font-bold">Jobs</h2>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2"/>
              New Job
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Job</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                <FormField control={form.control} name="jobName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Name</FormLabel>
                    <FormControl>
                      <Input {...field}/>
                    </FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>

                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue/>
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>

                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}

                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={(e)=>{
                            e.preventDefault();
                            setShowCustomInput(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2"/>
                          Custom Category
                        </Button>

                      </SelectContent>
                    </Select>

                    {showCustomInput && (
                      <div className="flex gap-2">
                        <Input
                          value={customCategory}
                          onChange={(e)=>setCustomCategory(e.target.value)}
                          placeholder="New category"
                        />
                        <Button size="sm" onClick={handleAddCustomCategory}>Add</Button>
                      </div>
                    )}

                  </FormItem>
                )}/>

                <Button type="submit">Create Job</Button>

              </form>
            </Form>

          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <Input placeholder="Search jobs..."/>
        </CardHeader>

        <CardContent>
          {isLoading ? "Loading..." : jobs?.map(job => (
            <div key={job.id} className="flex justify-between border-b py-2">
              <div>{job.jobName}</div>
              <div className="flex gap-2">
                <Button size="sm"><Pencil className="h-4 w-4"/></Button>
                <Button size="sm"><ImageIcon className="h-4 w-4"/></Button>
                <Button size="sm" onClick={()=>deleteJob.mutate(job.id)}>
                  <Trash2 className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}
