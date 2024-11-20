
# **Visit Logs Application**

This is a Node.js application that logs client information, including IP, browser details, and visit timestamps, to a PostgreSQL database. It allows filtering and viewing logs in a paginated table format.

The giud display how to deply application lcaly and further down describe how to deploy it to Google Cloud.

This guide explains how to deploy the application to **Google Cloud App Engine** with **Cloud SQL for PostgreSQL** and **Secret Manager** for secure configuration.

> **NOTE:** This guide is for educational purposes only and is not intended for a production environment. Security aspects of the application are not fully covered.
{style="color: red;"}

---

## **Features**
- Logs client information to a PostgreSQL database.
- Displays logs in a paginated table with filters (date range, records per page).
- Uses Google Cloud Secret Manager for secure configuration.
- Designed for deployment on Google Cloud App Engine with Cloud SQL.

---

## **Local Setup**

### **1. Prerequisites**
- Node.js and npm installed on your system.
- Docker installed and running (for local PostgreSQL).
- Google Cloud CLI installed and authenticated.

---

### **2. Clone the Repository**
```bash
git clone <repository-url>
cd <repository-folder>
```

---

### **3. Set Up Environment Variables**
Create a `.env` file in the project root with the following content:
```bash
POSTGRES_USER=secure_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=client_info
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}
```

---

### **4. Start PostgreSQL Locally**
Create a `docker-compose.yml` file in the root directory with the following content:
```yaml
version: "3.8"
services:
  db:
    image: postgres:latest
    container_name: postgres_db
    environment:
      POSTGRES_USER: secure_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: client_info
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

Run the following command to start PostgreSQL:
```bash
docker compose up -d
```

---

### **5. Install Dependencies**
```bash
npm install
```

---

### **6. Run Migrations**
```bash
npm run migrate
```

---

### **7. Start the Application Locally**
```bash
npm start
```

Visit the application at `http://localhost:8080`.

List of visitors is displayed at `http://localhost:8080/logs`.

---

# **Client Info Database Sample App Deployment to the Google Cloud**

This guide details how to deploy the "Client Info Database Sample App" to **Google Cloud**, utilizing **App Engine**, **Cloud SQL**, and **Cloud Build**. This project captures visitor data and stores it in a PostgreSQL database.

---

## **1. Set Up Google Cloud Project**
1. Create a new project in the [Google Cloud Console](https://console.cloud.google.com/):
   - Click "Select a project" in the top bar.
   - Click "New Project" and follow the prompts.
2. Note your **Project ID** (e.g., `your-project-id`).
3. Set the project ID as the default for the `gcloud` CLI:
   ```bash
   gcloud config set project your-project-id
   ```
4. Enable billing for the project:
   - Navigate to the **Billing** section of your project.
   - Ensure billing is enabled.

---

## **2. Enable Required Services**
Enable the necessary APIs for your project:
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable appengine.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

---

## **3. Set Up App Engine**
Initialize App Engine in your project:
```bash
gcloud app create --region=europe-west2
```
You can choose a different region if desired.

---

## **4. Set Up Cloud SQL**

### 4.1 Create Cloud SQL Instance
1. Create a PostgreSQL Cloud SQL instance with a **public IP**:
   ```bash
   gcloud sql instances create my-postgres-instance \
    --database-version=POSTGRES_17 \
    --region=europe-west2 \
    --authorized-networks=0.0.0.0/0 \
    --edition=ENTERPRISE \
    --tier=db-custom-1-3840 \
    --availability-type=ZONAL \
    --no-backup \
    --storage-size=10 \
    --storage-type=SSD \
    --no-storage-auto-increase \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=4 \
    --maintenance-release-channel=production \
    --replication=asynchronous

   ```

Secure postgress default user:

**Note:** Replace `your_secure_password` with a secure password.

```bash
gcloud sql users set-password postgres \
    --instance=my-postgres-instance \
    --password=your_secure_password
```


2. Create a database:
   ```bash
   gcloud sql databases create client_info --instance=my-postgres-instance
   ```

3. Create a database user:
   ```bash
   gcloud sql users create secure_user \
       --instance=my-postgres-instance \
       --password=secure_password
   ```

---

## **5. Store Database URL in Secret Manager**

Important step - please follow the instructions carefully.

Generate the `DATABASE_URL` string:
```bash
echo -n "postgresql://secure_user:secure_password@/client_info?host=/cloudsql/<INSTANCE_CONNECTION_NAME>" | \
gcloud secrets create DATABASE_URL --data-file=-
```

Replace `<INSTANCE_CONNECTION_NAME>` with the connection name of your Cloud SQL instance:
```bash
gcloud sql instances describe my-postgres-instance --format="value(connectionName)"
```

---

## **6. Grant Secret Manager Permissions**
Allow App Engine to access the `

```bash
gcloud secrets add-iam-policy-binding DATABASE_URL \
    --member="serviceAccount:<PROJECT_ID>@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

Replace `<PROJECT_ID>` with your Google Cloud project ID.
You can get list of projects by executing:
```bash
gcloud projects list
```
---

## **7. Configure `app.yaml`**

Review an `app.yaml` file in the project root:
```yaml
runtime: nodejs20
instance_class: F1
env: standard
automatic_scaling:
  target_cpu_utilization: 0.65
  target_throughput_utilization: 0.75
  max_instances: 2
env_variables:
  NODE_ENV: production
```

This configuration sets your application to run in production mode and allows automatic scaling based on traffic.

---

## **8. Configure `cloudbuild.yaml`**

Review and validate a `cloudbuild.yaml` file in the project root with the following content:

```yaml
steps:
  # Step 1: Install dependencies
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['install']

  # Step 2: Run Sequelize migrations with DATABASE_URL fetched from Secret Manager
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        echo "Fetching DATABASE_URL from Secret Manager..."
        DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL)
        echo "Running migrations..."
        DATABASE_URL=$DATABASE_URL npx sequelize-cli db:migrate

  # Step 3: Deploy to Google App Engine
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['app', 'deploy', '--quiet']

options:
  logging: CLOUD_LOGGING_ONLY
timeout: '900s'

```

---

## **9. Deploy the Application**

You can deploy manualy using the following command, however it is recommended to use Cloud Build triggers for automatic deployment.:
```bash
gcloud app deploy
```

after that you can validate the deployment by executing:
```bash
gcloud app browse
```

Logs can be checked using the following command:
```bash
gcloud app logs tail -s default
```


### 9.1 Push Code to GitHub
The following instruction shows deployment using Cloud Build triggers. If you prefer manual deployment, skip this step.

1. Add a remote repository to your project:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY>.git
   ```
2. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

### 9.2 Create a Cloud Build Trigger
Set up a trigger in Google Cloud to deploy your app on every commit:
```bash
gcloud beta builds triggers create github \
    --name="deploy-visit-logs-app" \
    --repo-name="<YOUR_REPOSITORY>" \
    --repo-owner="<YOUR_GITHUB_USERNAME>" \
    --branch-pattern=".*" \
    --build-config="cloudbuild.yaml"
```

Replace `<YOUR_REPOSITORY>` and `<YOUR_GITHUB_USERNAME>` with your repository details.

---

## **10. Test the Application**

1. Visit your application at:
   ```
   https://<YOUR_PROJECT_ID>.appspot.com
   ```
2. Check the visitor logs at:
   ```
   https://<YOUR_PROJECT_ID>.appspot.com/logs
   ```

---

## **11. Cleanup**

To avoid incurring unnecessary costs, clean up the resources:

Delete the project. First display list of projects:
 
   ```bash
   gcloud projects list
   ```
Then delete the project:
   ```bash
   gcloud projects delete <PROJECT_ID>
   ```
Replace `<PROJECT_ID>` with your project ID.


---

## **Troubleshooting**

### Database Connection Issues
- Verify the `DATABASE_URL` secret is correctly configured.
- Ensure the Cloud SQL instance has the correct user, password, and database.

### Permission Errors
- Ensure the App Engine service account has the `roles/secretmanager.secretAccessor` role.

### Deployment Failures
- Check the Cloud Build logs in the Google Cloud Console for more details.
