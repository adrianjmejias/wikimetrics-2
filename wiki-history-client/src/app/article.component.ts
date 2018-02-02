import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { DateTime } from 'luxon';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import 'rxjs/add/operator/combineLatest';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/shareReplay';
import 'rxjs/add/operator/combineLatest';

import { NavbarService } from './navbar/navbar.service';
import { Article, ArticleService } from './article.service';
import { WikimetricsService, WikimetricsRevision } from './wikimetrics.service';
import { NewVisualizationComponent } from './new-visualization/new-visualization.component';

@Component({
  selector: 'app-article',
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class ArticleComponent implements OnInit, OnDestroy {
  article$: Observable<Article>;
  revisions$: Observable<WikimetricsRevision[]>;
  count$: Observable<number>;

  loading$: Observable<boolean>;
  onclick$: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navbarSvc: NavbarService,
    private articleSvc: ArticleService,
    private wikimetricsSvc: WikimetricsService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // listen title from url
    this.article$ = this.route.paramMap.switchMap(params => {
      return this.articleSvc.get({title: params.get('title'), locale: params.get('locale')} as Article);
    }).shareReplay();

    this.article$.subscribe(art => {
      // setting navbar
      this.navbarSvc.config$.next({title: art.title, button: 'Nueva Visualización', showUser: true});
    });

    this.revisions$ = this.article$.switchMap(art =>
      this.wikimetricsSvc.revisions({locale: art.locale, title: art.title,  page_size: 20, sort: 'desc'})
    ).shareReplay();

    this.count$ = this.article$.switchMap(art =>
      this.wikimetricsSvc.count({locale: art.locale, title: art.title})
    ).shareReplay();

    this.loading$ = this.revisions$.combineLatest(this.count$, (r, c) => !!r && !!c);

    // subscribe to onclick of navbar button
    this.onclick$ = this.navbarSvc.onClick().subscribe(() => {
      this.openDialog();
    });
  }

  ngOnDestroy() {
    this.onclick$.unsubscribe();
  }

  openDialog() {
    const dialogRef = this.dialog.open(NewVisualizationComponent, { data: this.article$, width: '50%' });

    dialogRef.afterClosed().subscribe(() => {});
  }

  timestamps(revs: WikimetricsRevision[]) {
    return revs.map(rev => rev.timestamp);
  }

  sizes(revs: WikimetricsRevision[]) {
    return revs.map(rev => rev.size);
  }

  lastTimestamp(rev: WikimetricsRevision) {
    return DateTime.fromISO(rev.timestamp).toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS);
  }

  lastAuthor(rev: WikimetricsRevision) { return rev.user; }

  size(rev: WikimetricsRevision) { return rev.size; }

  getLink(art: Article) { return `https://${art.locale}.wikipedia.org/wiki/${art.title}`; }

  goToEdit(visTitle: string) {
    this.router.navigate(['edit', visTitle], { relativeTo: this.route });
  }
}
