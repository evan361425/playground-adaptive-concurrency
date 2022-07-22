#!/usr/bin/python
# -*- coding: utf-8 -*-
from diagrams import Cluster, Diagram, Edge
from diagrams.onprem.monitoring import Grafana
from diagrams.programming.language import Nodejs
from diagrams.onprem.network import Nginx
from diagrams.elastic.elasticsearch import Elasticsearch
from diagrams.onprem.client import User

with Diagram(
    name="Architecture",
    show=False,
    filename="architecture",
    outformat="png",
    direction="LR",
):
    with Cluster("Application"):
        server = Nodejs("Server - /wait/<ms>")
        proxy = Nginx("Proxy")

    with Cluster("Monitor"):
        dashboard = Grafana("Dashboard")
        db = Elasticsearch("DB")

    client = Nodejs("Client")
    admin = User("Admin")

    client >> Edge() >> proxy >> Edge() >> server
    server >> Edge(label="metrics") >> db
    db >> Edge() >> dashboard << Edge() << admin
